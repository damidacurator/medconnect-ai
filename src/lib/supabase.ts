import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vynofomluylylbnhtvnq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5bm9mb21sdXlseWxibmh0dm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDI4NDgsImV4cCI6MjA5MTM3ODg0OH0.80PUb5BalvtN0PpjcWIbUnz9SmvVkdQ6NlshYzKLBjI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'patient' | 'doctor' | 'institution';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  unique_code?: string;
  phone?: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  roleSpecificData?: {
    dob?: string;
    gender?: string;
    bloodGroup?: string;
    councilReg?: string;
    specialization?: string;
    experience?: string | number;
    institutionName?: string;
    regNumber?: string;
    category?: string;
    [key: string]: unknown;
  };
}

export async function signUp({
  email,
  password,
  fullName,
  role,
  phone,
  roleSpecificData = {},
}: SignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        phone,
        ...roleSpecificData,
      },
    },
  });

  if (error) {
    throw error;
  }

  // If user is created, sync extra metadata to profile if needed
  if (data.user) {
    try {
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        role,
        full_name: fullName,
        email,
        phone: phone || null,
        metadata: roleSpecificData,
        updated_at: new Date().toISOString(),
      });
      if (upsertErr) {
        console.warn('Client profile upsert note (managed by trigger):', upsertErr.message);
      }
    } catch (err) {
      console.warn('Client profile sync skipped:', err);
    }
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.warn('Local auth signOut note:', err);
  }
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Global auth signOut note:', err);
  }
  try {
    localStorage.removeItem('medconnect_demo_user');
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth') || key.includes('medconnect_demo'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (err) {
    console.warn('Storage cleanup note:', err);
  }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Try to query profiles table first
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile && !error) {
    return profile as UserProfile;
  }

  // Fallback to user metadata
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    role: (metadata.role as UserRole) || 'patient',
    full_name: (metadata.full_name as string) || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    phone: metadata.phone as string | undefined,
    metadata,
  };
}

// ============================================
// DATABASE OPERATION HELPERS
// ============================================

export interface SymptomLogData {
  symptom_type: string;
  severity: 'mild' | 'moderate' | 'severe' | string;
  severity_score?: number;
  duration?: string;
  body_location?: string;
  pain_level?: number;
  notes?: string;
}

export async function logSymptom(symptomData: SymptomLogData, userId: string) {
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id || '';
  }
  if (!userId) throw new Error('No user ID provided');

  const recordedAt = new Date().toISOString();
  const entryId = crypto.randomUUID();
  const fullLog = {
    id: entryId,
    patient_id: userId,
    created_at: recordedAt,
    ...symptomData,
  };

  // 1. Always update local cache so current browser immediately has the new entry
  const KEY = 'medconnect_symptom_logs';
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    all.unshift(fullLog);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save symptom log to localStorage', err);
  }

  // 2. Insert into cloud symptom_logs table
  try {
    await supabase.from('symptom_logs').insert(fullLog as any);
  } catch (cloudErr) {
    console.warn('Supabase symptom_logs insert note:', cloudErr);
  }

  // 3. Mirror to profiles.metadata.symptoms_history & latest_symptoms
  // Since all authenticated physicians can query public profiles under RLS,
  // this guarantees instant cross-device visibility on the doctor workstation
  try {
    const { data: prof } = await supabase.from('profiles').select('metadata').eq('id', userId).maybeSingle();
    const existingMeta = (prof?.metadata as Record<string, any>) || {};
    const existingHistory = Array.isArray(existingMeta.symptoms_history) ? existingMeta.symptoms_history : [];
    const updatedHistory = [fullLog, ...existingHistory.filter((e: any) => e.id !== entryId)].slice(0, 40);
    await supabase.from('profiles').update({
      metadata: {
        ...existingMeta,
        latest_symptoms: fullLog,
        symptoms_history: updatedHistory,
      },
    }).eq('id', userId);
  } catch (profErr) {
    console.warn('Profile symptom metadata sync error:', profErr);
  }
}

export async function getSymptomHistory(limit = 20, userId = '') {
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id || '';
  }
  if (!userId) return [];

  // 1. Query cloud symptom_logs table
  try {
    const { data, error } = await supabase
      .from('symptom_logs')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) return data;
  } catch {
    // fallback
  }

  // 2. Query profiles.metadata.symptoms_history (accessible by attending physicians)
  try {
    const { data: prof } = await supabase.from('profiles').select('metadata').eq('id', userId).maybeSingle();
    const metaList = (prof?.metadata as any)?.symptoms_history;
    if (Array.isArray(metaList) && metaList.length > 0) {
      return metaList.slice(0, limit);
    }
  } catch {
    // fallback
  }

  // 3. Local storage fallback
  const KEY = 'medconnect_symptom_logs';
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    return all.filter((r: any) => r.patient_id === userId).slice(0, limit);
  } catch {
    return [];
  }
}

export async function deleteSymptomLog(id: string, userId = '') {
  if (!id) return;
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id || '';
  }

  try {
    await supabase.from('symptom_logs').delete().eq('id', id);
  } catch {
    // fallback
  }

  const KEY = 'medconnect_symptom_logs';
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    const filtered = all.filter((r: any) => r.id !== id);
    localStorage.setItem(KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to remove symptom log from localStorage', err);
  }

  if (userId) {
    try {
      const { data: prof } = await supabase.from('profiles').select('metadata').eq('id', userId).maybeSingle();
      const existingMeta = (prof?.metadata as Record<string, any>) || {};
      const existingHistory = Array.isArray(existingMeta.symptoms_history) ? existingMeta.symptoms_history : [];
      const updatedHistory = existingHistory.filter((e: any) => e.id !== id);
      await supabase.from('profiles').update({
        metadata: {
          ...existingMeta,
          latest_symptoms: updatedHistory[0] || null,
          symptoms_history: updatedHistory,
        },
      }).eq('id', userId);
    } catch (profErr) {
      console.warn('Profile symptom delete metadata sync error:', profErr);
    }
  }
}

export interface VitalsData {
  heart_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  oxygen_saturation?: number | null;
  temperature?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  blood_glucose?: number | null;
  sleep_hours?: number | null;
  notes?: string | null;
  recorded_at?: string;
}

export async function saveVitals(vitalsData: VitalsData, userId: string) {
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id || '';
  }
  if (!userId) throw new Error('No user ID provided');

  const recordedAt = vitalsData.recorded_at || new Date().toISOString();
  const payload: Record<string, unknown> = {
    patient_id: userId,
    recorded_at: recordedAt,
    heart_rate: vitalsData.heart_rate,
    systolic_bp: vitalsData.systolic_bp,
    diastolic_bp: vitalsData.diastolic_bp,
    oxygen_saturation: vitalsData.oxygen_saturation,
    temperature: vitalsData.temperature,
    weight_kg: vitalsData.weight_kg,
    height_cm: vitalsData.height_cm,
    blood_glucose: vitalsData.blood_glucose,
    notes: vitalsData.notes || null,
  };

  // 1. Always update local cache so current browser immediately has the new entry
  const KEY = 'medconnect_health_vitals';
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    all.unshift({
      id: crypto.randomUUID(),
      ...payload,
    });
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save vitals to localStorage', err);
  }

  // 2. Sync to Supabase cloud health_vitals table for attending doctors
  try {
    const { error } = await supabase.from('health_vitals').insert(payload as any);
    if (error) {
      console.warn('Supabase health_vitals insert note:', error);
    }
  } catch (cloudErr) {
    console.warn('Supabase health_vitals insert exception:', cloudErr);
  }

  // 3. Sync to profiles.metadata.vitals_history & latest_vitals
  // Since all authenticated physicians can query public.profiles via RLS,
  // this guarantees simultaneous real-time availability on the doctor workstation
  try {
    const { data: prof } = await supabase.from('profiles').select('metadata').eq('id', userId).maybeSingle();
    const existingMeta = (prof?.metadata as Record<string, any>) || {};
    const existingHistory = Array.isArray(existingMeta.vitals_history) ? existingMeta.vitals_history : [];
    const formattedEntry = {
      id: crypto.randomUUID(),
      date: new Date(recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bp: `${vitalsData.systolic_bp || 120}/${vitalsData.diastolic_bp || 80}`,
      hr: vitalsData.heart_rate || 72,
      temp: Number(vitalsData.temperature) || 36.6,
      spo2: Number(vitalsData.oxygen_saturation) || 98,
      glucose: vitalsData.blood_glucose ? Number(vitalsData.blood_glucose) : undefined,
      weight: vitalsData.weight_kg ? Number(vitalsData.weight_kg) : undefined,
      recorded_at: recordedAt,
    };
    const updatedHistory = [formattedEntry, ...existingHistory.filter((e: any) => e.recorded_at !== recordedAt)].slice(0, 30);
    await supabase.from('profiles').update({
      metadata: {
        ...existingMeta,
        latest_vitals: formattedEntry,
        vitals_history: updatedHistory,
      },
    }).eq('id', userId);
  } catch (profErr) {
    console.warn('Profile vitals metadata sync error:', profErr);
  }
}

export async function getVitalsHistory(limit = 20, userId = '') {
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id || '';
  }
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('health_vitals')
      .select('*')
      .eq('patient_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) return data;
  } catch {
    // fallback
  }

  // Fallback: check profile metadata vitals_history
  try {
    const { data: prof } = await supabase.from('profiles').select('metadata').eq('id', userId).maybeSingle();
    const metaList = (prof?.metadata as any)?.vitals_history;
    if (Array.isArray(metaList) && metaList.length > 0) {
      return metaList.slice(0, limit);
    }
  } catch {
    // ignore
  }

  const KEY = 'medconnect_health_vitals';
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    return all.filter((r: any) => r.patient_id === userId).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getLatestVitals(userId = '') {
  const history = await getVitalsHistory(1, userId);
  return history[0] || null;
}

export async function saveBMIRecord(bmiData: {
  height_cm: number;
  weight_kg: number;
  bmi_value: number;
  category: string;
}, userId: string) {
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id || '';
  }
  if (!userId) return;

  try {
    await supabase.from('bmi_records').insert({ ...bmiData, patient_id: userId } as any);
  } catch {
    const KEY = 'medconnect_bmi_records';
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    all.unshift({ id: crypto.randomUUID(), patient_id: userId, ...bmiData, created_at: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(all));
  }
}

export async function getAllDoctorProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor')
      .order('full_name', { ascending: true });

    if (!error && data) return data;
  } catch (err) {
    console.warn('Error fetching doctor profiles:', err);
  }

  return [];
}

export async function updateProfile(
  userId: string,
  updates: Record<string, unknown>
) {
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id || '';
  }
  if (!userId) throw new Error('No user ID provided');

  try {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    });
    if (!error) return;
  } catch {
    // fallback
  }

  const KEY = `medconnect_profile_${userId}`;
  const existing = JSON.parse(localStorage.getItem(KEY) || '{}');
  localStorage.setItem(KEY, JSON.stringify({ ...existing, ...updates, updated_at: new Date().toISOString() }));
}

