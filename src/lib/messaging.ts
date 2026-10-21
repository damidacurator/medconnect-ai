/**
 * MedConnect AI - Cloud & Local Real-Time Messaging Protocol
 * Enables direct bidirectional clinical messaging between patients and attending physicians.
 * Backed by Supabase `public.messages` with local fallback caching.
 */

import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  senderRole: 'patient' | 'doctor';
  timestamp: string;
  createdAt: string;
  isRead: boolean;
}

function getCacheKey(id1: string, id2: string): string {
  const sorted = [id1, id2].sort().join('_');
  return `medconnect_chat_thread_${sorted}`;
}

export async function fetchMessages(
  userId1: string,
  userId2: string,
  currentUserId?: string,
  currentUserRole: 'patient' | 'doctor' = 'doctor'
): Promise<ChatMessage[]> {
  if (!userId1 || !userId2) return [];
  const cacheKey = getCacheKey(userId1, userId2);

  let cloudMessages: ChatMessage[] = [];
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      cloudMessages = data.map((row: any) => {
        const isSelf = row.sender_id === currentUserId;
        const role = isSelf
          ? currentUserRole
          : (currentUserRole === 'doctor' ? 'patient' : 'doctor');

        return {
          id: row.id,
          senderId: row.sender_id,
          receiverId: row.receiver_id,
          text: row.content,
          senderRole: role,
          timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: row.created_at,
          isRead: Boolean(row.is_read),
        };
      });
    }
  } catch (err) {
    console.warn('Supabase fetchMessages error, falling back to cache:', err);
  }

  // Load from local storage cache
  let localMessages: ChatMessage[] = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) localMessages = JSON.parse(raw);
  } catch {
    localMessages = [];
  }

  // Merge cloud and local, avoiding duplicates by id
  const map = new Map<string, ChatMessage>();
  for (const m of localMessages) {
    map.set(m.id, m);
  }
  for (const m of cloudMessages) {
    map.set(m.id, m);
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Update local cache
  try {
    localStorage.setItem(cacheKey, JSON.stringify(merged));
  } catch {
    // ignore
  }

  return merged;
}

export async function sendChatMessage(
  senderId: string,
  receiverId: string,
  content: string,
  senderRole: 'patient' | 'doctor'
): Promise<ChatMessage> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Empty message content');

  const now = new Date();
  const tempId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const messageItem: ChatMessage = {
    id: tempId,
    senderId,
    receiverId,
    text: trimmed,
    senderRole,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: now.toISOString(),
    isRead: false,
  };

  // Immediate local cache update
  const cacheKey = getCacheKey(senderId, receiverId);
  try {
    const raw = localStorage.getItem(cacheKey);
    const list: ChatMessage[] = raw ? JSON.parse(raw) : [];
    list.push(messageItem);
    localStorage.setItem(cacheKey, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save to local chat cache:', err);
  }

  // Sync to Supabase cloud
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: trimmed,
        is_read: false,
        created_at: now.toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      messageItem.id = data.id;
      // update cache with real ID
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const list: ChatMessage[] = JSON.parse(raw);
          const idx = list.findIndex(m => m.id === tempId);
          if (idx >= 0) {
            list[idx].id = data.id;
            localStorage.setItem(cacheKey, JSON.stringify(list));
          }
        }
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('Could not sync message to Supabase cloud:', err);
  }

  return messageItem;
}

export async function getUnreadMessagesCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (!error && typeof count === 'number') {
      return count;
    }
  } catch {
    // fallback
  }

  // Fallback to checking local storage
  try {
    let unread = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('medconnect_chat_thread_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: ChatMessage[] = JSON.parse(raw);
          unread += list.filter(m => m.receiverId === userId && !m.isRead).length;
        }
      }
    }
    return unread;
  } catch {
    return 0;
  }
}

export async function markMessagesAsRead(senderId: string, currentUserId: string): Promise<void> {
  if (!senderId || !currentUserId) return;

  // Local cache update
  const cacheKey = getCacheKey(senderId, currentUserId);
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const list: ChatMessage[] = JSON.parse(raw);
      for (const m of list) {
        if (m.senderId === senderId && m.receiverId === currentUserId) {
          m.isRead = true;
        }
      }
      localStorage.setItem(cacheKey, JSON.stringify(list));
    }
  } catch {
    // ignore
  }

  // Cloud update
  try {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false);
  } catch {
    // ignore
  }
}
