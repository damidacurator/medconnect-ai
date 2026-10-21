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

  try {
    const { error } = await supabase.from('symptom_logs').insert({
      ...symptomData,
      patient_id: userId,
      created_at: new Date().toISOString(),
    } as any);
    if (!error) return;
  } catch {
    // continue to fallback
  }

  // Local storage fallback for resilient demo & offline support
  const KEY = 'medconnect_symptom_logs';
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    all.unshift({
      id: crypto.randomUUID(),
      patient_id: userId,
      ...symptomData,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save symptom log to localStorage', err);
  }
}

export async function getSymptomHistory(limit = 10, userId = '') {
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id || '';
  }
  if (!userId) return [];

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

  const KEY = 'medconnect_symptom_logs';
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    return all.filter((r: any) => r.patient_id === userId).slice(0, limit);
  } catch {
    return [];
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

  const payload: Record<string, unknown> = {
    patient_id: userId,
    recorded_at: new Date().toISOString(),
    ...vitalsData,
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

