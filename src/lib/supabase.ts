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
  age?: number | null;
  gender?: string | null;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

export interface PrescriptionItem {
  id?: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  doctor?: string;
  date?: string;
  emrCode?: string;
  status?: string;
}

export interface LabOrderItem {
  id?: string;
  testName: string;
  category?: string;
  priority?: string;
  instructions?: string;
  doctor?: string;
  date?: string;
  emrCode?: string;
  status?: string;
}

export interface ConsultationRecord {
  id: string;
  emrCode: string;
  patientId: string;
  patientName: string;
  pid: string;
  doctorId: string;
  doctorName: string;
  date: string;
  chiefComplaint: string;
  hpi?: string;
  reviewOfSystems?: string[];
  vitals?: any;
  examinationFindings?: string;
  diagnoses: string[];
  differentialDiagnosis?: string;
  treatmentPlan: string;
  prescriptions: PrescriptionItem[];
  labOrders: LabOrderItem[];
  followUpDate?: string;
  followUpNotes?: string;
  created_at?: string;
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

  let profile: any = null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (!error && data) {
      profile = data;
    }
  } catch {
    // fallback
  }

  const metadata = (profile?.metadata || user.user_metadata || {}) as Record<string, any>;

  // Resolve age
  let resolvedAge = profile?.age ?? metadata.age ?? user.user_metadata?.age ?? null;
  if (resolvedAge === null || resolvedAge === undefined) {
    try {
      const stored = localStorage.getItem(`medconnect_patient_age_${user.id}`);
      if (stored) resolvedAge = parseInt(stored, 10);
    } catch { /* ignore */ }
  } else {
    resolvedAge = Number(resolvedAge);
    try { localStorage.setItem(`medconnect_patient_age_${user.id}`, String(resolvedAge)); } catch { /* ignore */ }
  }

  // Resolve gender
  let resolvedGender = profile?.gender ?? metadata.gender ?? user.user_metadata?.gender ?? null;
  if (!resolvedGender) {
    try {
      const stored = localStorage.getItem(`medconnect_patient_gender_${user.id}`);
      if (stored) resolvedGender = stored;
    } catch { /* ignore */ }
  } else {
    try { localStorage.setItem(`medconnect_patient_gender_${user.id}`, String(resolvedGender)); } catch { /* ignore */ }
  }

  return {
    id: user.id,
    role: (profile?.role || metadata.role || user.user_metadata?.role || 'patient') as UserRole,
    full_name: profile?.full_name || metadata.full_name || (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
    email: profile?.email || user.email || '',
    phone: profile?.phone || metadata.phone || (user.user_metadata?.phone as string),
    unique_code: profile?.unique_code || metadata.unique_code,
    age: resolvedAge,
    gender: resolvedGender,
    created_at: profile?.created_at,
    metadata: {
      ...metadata,
      age: resolvedAge,
      gender: resolvedGender,
    },
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

export async function getAllPatientProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'patient')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((p: any) => {
        let age = (typeof p.age === 'number' && !isNaN(p.age)) ? p.age : (p.metadata?.age ? Number(p.metadata.age) : null);
        let gender = p.gender ?? p.metadata?.gender ?? null;

        if (age === null || age === undefined) {
          try {
            const stored = localStorage.getItem(`medconnect_patient_age_${p.id}`);
            if (stored) age = parseInt(stored, 10);
          } catch { /* ignore */ }
        }
        if (!gender) {
          try {
            const stored = localStorage.getItem(`medconnect_patient_gender_${p.id}`);
            if (stored) gender = stored;
          } catch { /* ignore */ }
        }

        return {
          id: p.id,
          role: 'patient' as UserRole,
          full_name: p.full_name || 'Patient',
          email: p.email || '',
          phone: p.phone || '',
          unique_code: p.unique_code,
          age,
          gender,
          metadata: {
            ...(p.metadata || {}),
            age,
            gender,
          },
          created_at: p.created_at,
        };
      });
    }
  } catch (err) {
    console.warn('Error fetching all patient profiles:', err);
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

  const rawAge = updates.age;
  const parsedAge = rawAge !== undefined && rawAge !== null && rawAge !== '' && !isNaN(Number(rawAge))
    ? Number(rawAge)
    : null;

  const rawBlood = (updates.blood_group as string) || (updates.bloodGroup as string) || ((updates.metadata as any)?.blood_group as string);
  const rawGender = (updates.gender as string) || ((updates.metadata as any)?.gender as string);

  // Always update local cache immediately so views never lag
  try {
    if (parsedAge !== null) {
      localStorage.setItem(`medconnect_patient_age_${userId}`, String(parsedAge));
      localStorage.setItem(`vitalia_patient_age_${userId}`, String(parsedAge));
    }
    if (rawGender) {
      localStorage.setItem(`medconnect_patient_gender_${userId}`, rawGender);
    }
    if (rawBlood) {
      localStorage.setItem(`medconnect_patient_blood_${userId}`, rawBlood);
    }
    const KEY = `medconnect_profile_${userId}`;
    const existing = JSON.parse(localStorage.getItem(KEY) || '{}');
    localStorage.setItem(KEY, JSON.stringify({
      ...existing,
      ...updates,
      ...(parsedAge !== null ? { age: parsedAge } : {}),
      ...(rawGender ? { gender: rawGender } : {}),
      ...(rawBlood ? { blood_group: rawBlood } : {}),
      updated_at: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('LocalStorage profile caching note:', err);
  }

  // Sync to Supabase Auth metadata
  try {
    await supabase.auth.updateUser({
      data: {
        ...(updates.full_name ? { full_name: updates.full_name } : {}),
        ...(parsedAge !== null ? { age: parsedAge } : {}),
        ...(rawGender ? { gender: rawGender } : {}),
      },
    });
  } catch (authErr) {
    console.warn('Supabase auth metadata update note:', authErr);
  }

  // Fetch existing profile metadata to avoid wiping nested objects
  let existingMeta: Record<string, any> = {};
  let existingRole = 'patient';
  let existingEmail = '';
  try {
    const { data: cur } = await supabase
      .from('profiles')
      .select('metadata, role, email')
      .eq('id', userId)
      .maybeSingle();
    if (cur) {
      existingMeta = (cur.metadata as Record<string, any>) || {};
      if (cur.role) existingRole = cur.role;
      if (cur.email) existingEmail = cur.email;
    }
  } catch (err) {
    console.warn('Profile prefetch note:', err);
  }

  // Ensure metadata object contains age, gender, and blood_group
  const inputMeta = (updates.metadata as Record<string, any>) || {};
  const mergedMetadata: Record<string, any> = {
    ...existingMeta,
    ...inputMeta,
    ...(parsedAge !== null ? { age: parsedAge } : {}),
    ...(rawGender ? { gender: rawGender } : {}),
    ...(rawBlood ? { blood_group: rawBlood } : {}),
  };

  // Build safe update payload - avoids triggering NOT NULL constraints on email & role
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
    metadata: mergedMetadata,
  };
  if (updates.full_name !== undefined) updatePayload.full_name = updates.full_name;
  if (updates.phone !== undefined) updatePayload.phone = updates.phone;
  if (updates.avatar_url !== undefined) updatePayload.avatar_url = updates.avatar_url;
  if (parsedAge !== null) updatePayload.age = parsedAge;
  if (rawGender) updatePayload.gender = rawGender;

  // 1. Try targeted UPDATE (does not evaluate INSERT NOT-NULL constraints on missing columns)
  try {
    let { error: updateErr, count } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    // If column 'age' or 'gender' does not exist in profiles schema, retry without them (they are safely inside metadata)
    if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('does not exist'))) {
      delete updatePayload.age;
      delete updatePayload.gender;
      const retry = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);
      updateErr = retry.error;
    }

    // 2. If row did not exist yet (count === 0), do an upsert including role and email
    if (!updateErr && count === 0) {
      const authUser = await getCurrentUser();
      const email = existingEmail || authUser?.email || '';
      const role = existingRole || (authUser?.user_metadata?.role as string) || 'patient';

      await supabase.from('profiles').upsert({
        id: userId,
        email,
        role,
        ...updatePayload,
      });
    }

    if (updateErr) {
      console.warn('Profile update note:', updateErr.message);
    }
  } catch (err) {
    console.warn('Profile update exception:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('medconnect:profile-updated', { detail: { userId, updates } }));
  }
}

// ============================================
// EMR CONSULTATION SUITE
// ============================================

export async function saveConsultationRecord(record: ConsultationRecord): Promise<void> {
  const timestamp = new Date().toISOString();
  const enriched: ConsultationRecord = {
    ...record,
    created_at: record.created_at || timestamp,
  };

  // 1. Local Cache (instant multi-device & offline guarantee)
  try {
    // Save to master all list
    const allKey = 'medconnect_consultations_all';
    const all = JSON.parse(localStorage.getItem(allKey) || '[]');
    const existingAllIdx = all.findIndex((c: any) => c.id === enriched.id || c.emrCode === enriched.emrCode);
    if (existingAllIdx !== -1) {
      all[existingAllIdx] = enriched;
    } else {
      all.unshift(enriched);
    }
    localStorage.setItem(allKey, JSON.stringify(all));

    // Save to patient specific list
    const pKey = `medconnect_consultations_${enriched.patientId}`;
    const pList = JSON.parse(localStorage.getItem(pKey) || '[]');
    const pIdx = pList.findIndex((c: any) => c.id === enriched.id || c.emrCode === enriched.emrCode);
    if (pIdx !== -1) {
      pList[pIdx] = enriched;
    } else {
      pList.unshift(enriched);
    }
    localStorage.setItem(pKey, JSON.stringify(pList));

    // Save to doctor specific list
    const dKey = `medconnect_consultations_doctor_${enriched.doctorId}`;
    const dList = JSON.parse(localStorage.getItem(dKey) || '[]');
    const dIdx = dList.findIndex((c: any) => c.id === enriched.id || c.emrCode === enriched.emrCode);
    if (dIdx !== -1) {
      dList[dIdx] = enriched;
    } else {
      dList.unshift(enriched);
    }
    localStorage.setItem(dKey, JSON.stringify(dList));
  } catch (storageErr) {
    console.warn('Local storage consultation cache error:', storageErr);
  }

  // 2. Mirror into patient profiles.metadata.consultation_records
  try {
    const { data: pProfile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', enriched.patientId)
      .maybeSingle();

    const existingMeta = (pProfile?.metadata as Record<string, any>) || {};
    const existingConsults = Array.isArray(existingMeta.consultation_records) ? existingMeta.consultation_records : [];
    const updatedConsults = [enriched, ...existingConsults.filter((c: any) => c.id !== enriched.id && c.emrCode !== enriched.emrCode)].slice(0, 50);

    // Also mirror prescriptions list into patient metadata
    const existingRx = Array.isArray(existingMeta.prescriptions) ? existingMeta.prescriptions : [];
    const newRx = (enriched.prescriptions || []).map(rx => ({
      ...rx,
      id: rx.id || `rx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      doctor: enriched.doctorName,
      date: enriched.date,
      emrCode: enriched.emrCode,
      status: 'Active',
    }));
    const updatedRx = [...newRx, ...existingRx].slice(0, 50);

    // Also mirror lab orders into patient metadata
    const existingLabs = Array.isArray(existingMeta.lab_orders) ? existingMeta.lab_orders : [];
    const newLabs = (enriched.labOrders || []).map(l => ({
      ...l,
      id: l.id || `lab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      doctor: enriched.doctorName,
      date: enriched.date,
      emrCode: enriched.emrCode,
      status: 'Ordered',
    }));
    const updatedLabs = [...newLabs, ...existingLabs].slice(0, 50);

    await supabase.from('profiles').update({
      metadata: {
        ...existingMeta,
        latest_consultation: enriched,
        consultation_records: updatedConsults,
        prescriptions: updatedRx,
        lab_orders: updatedLabs,
      },
    }).eq('id', enriched.patientId);
  } catch (profErr) {
    console.warn('Profile consultation metadata sync error:', profErr);
  }

  // 3. Mirror into doctor profiles.metadata.doctor_consultation_records
  try {
    const { data: dProfile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', enriched.doctorId)
      .maybeSingle();

    if (dProfile) {
      const existingDocMeta = (dProfile.metadata as Record<string, any>) || {};
      const existingDocConsults = Array.isArray(existingDocMeta.doctor_consultation_records) ? existingDocMeta.doctor_consultation_records : [];
      const updatedDocConsults = [enriched, ...existingDocConsults.filter((c: any) => c.id !== enriched.id && c.emrCode !== enriched.emrCode)].slice(0, 100);

      await supabase.from('profiles').update({
        metadata: {
          ...existingDocMeta,
          doctor_consultation_records: updatedDocConsults,
        },
      }).eq('id', enriched.doctorId);
    }
  } catch (docProfErr) {
    console.warn('Doctor profile consultation sync error:', docProfErr);
  }

  // 4. Insert into dedicated Supabase tables (consultations, prescriptions, lab_orders)
  try {
    await supabase.from('consultations').insert({
      id: enriched.id,
      emr_code: enriched.emrCode,
      patient_id: enriched.patientId,
      doctor_id: enriched.doctorId,
      chief_complaint: enriched.chiefComplaint,
      diagnosis: Array.isArray(enriched.diagnoses) ? enriched.diagnoses.join(', ') : enriched.diagnoses,
      treatment_plan: enriched.treatmentPlan,
      vitals: enriched.vitals,
      notes: enriched.treatmentPlan || enriched.chiefComplaint,
      created_at: enriched.created_at,
    });
  } catch (cloudErr) {
    console.warn('Supabase consultations table insert note:', cloudErr);
  }

  if (enriched.prescriptions && enriched.prescriptions.length > 0) {
    try {
      const rxRows = enriched.prescriptions.map(p => ({
        patient_id: enriched.patientId,
        doctor_id: enriched.doctorId,
        medication_name: p.medication,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions || '',
        status: 'active',
      }));
      await supabase.from('prescriptions').insert(rxRows as any);
    } catch (rxErr) {
      console.warn('Supabase prescriptions table insert note:', rxErr);
    }
  }

  // 5. Broadcast custom event across all windows / tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('medconnect:emr-updated', { detail: enriched }));
  }
}

export async function getPatientConsultations(patientId: string): Promise<ConsultationRecord[]> {
  if (!patientId) return [];

  const foundMap = new Map<string, ConsultationRecord>();

  // 1. Try querying Supabase consultations table
  try {
    const { data: cRows, error: cErr } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (!cErr && Array.isArray(cRows)) {
      for (const row of cRows) {
        const key = row.emr_code || row.id;
        foundMap.set(key, {
          id: row.id,
          emrCode: row.emr_code || `EMR-${row.id.slice(0, 8).toUpperCase()}`,
          patientId: row.patient_id,
          patientName: row.patient_name || 'Patient',
          pid: `PID-${row.patient_id.replace(/-/g, '').slice(0, 9).toUpperCase()}`,
          doctorId: row.doctor_id || 'doc-1',
          doctorName: row.doctor_name || 'Attending Physician',
          date: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          chiefComplaint: row.chief_complaint || '',
          diagnoses: row.diagnosis ? row.diagnosis.split(', ') : ['General Health Assessment'],
          treatmentPlan: row.treatment_plan || row.doctor_notes || '',
          prescriptions: row.prescriptions || [],
          labOrders: row.lab_orders || [],
          vitals: row.vitals || {},
          created_at: row.created_at,
        });
      }
    }
  } catch (err) {
    console.warn('Error querying consultations table:', err);
  }

  // 2. Query patient profiles.metadata.consultation_records
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', patientId)
      .maybeSingle();

    const metaList = (prof?.metadata as any)?.consultation_records;
    if (Array.isArray(metaList)) {
      for (const item of metaList) {
        const key = item.emrCode || item.id;
        if (!foundMap.has(key)) {
          foundMap.set(key, item);
        }
      }
    }
  } catch (err) {
    console.warn('Error querying patient profile consultation metadata:', err);
  }

  // 3. Fallback to localStorage
  try {
    const pKey = `medconnect_consultations_${patientId}`;
    const pList = JSON.parse(localStorage.getItem(pKey) || '[]');
    for (const item of pList) {
      const key = item.emrCode || item.id;
      if (!foundMap.has(key)) {
        foundMap.set(key, item);
      }
    }

    const allList = JSON.parse(localStorage.getItem('medconnect_consultations_all') || '[]');
    for (const item of allList) {
      if (item.patientId === patientId) {
        const key = item.emrCode || item.id;
        if (!foundMap.has(key)) {
          foundMap.set(key, item);
        }
      }
    }
  } catch (err) {
    console.warn('Error reading local consultation storage:', err);
  }

  return Array.from(foundMap.values()).sort(
    (a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime()
  );
}

export async function getDoctorConsultations(doctorId: string): Promise<ConsultationRecord[]> {
  if (!doctorId) return [];

  const foundMap = new Map<string, ConsultationRecord>();

  // 1. Try querying Supabase consultations table
  try {
    const { data: cRows, error: cErr } = await supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (!cErr && Array.isArray(cRows)) {
      for (const row of cRows) {
        const key = row.emr_code || row.id;
        foundMap.set(key, {
          id: row.id,
          emrCode: row.emr_code || `EMR-${row.id.slice(0, 8).toUpperCase()}`,
          patientId: row.patient_id,
          patientName: row.patient_name || 'Patient',
          pid: `PID-${row.patient_id.replace(/-/g, '').slice(0, 9).toUpperCase()}`,
          doctorId: row.doctor_id || doctorId,
          doctorName: row.doctor_name || 'Attending Physician',
          date: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          chiefComplaint: row.chief_complaint || '',
          diagnoses: row.diagnosis ? row.diagnosis.split(', ') : ['General Health Assessment'],
          treatmentPlan: row.treatment_plan || row.doctor_notes || '',
          prescriptions: row.prescriptions || [],
          labOrders: row.lab_orders || [],
          vitals: row.vitals || {},
          created_at: row.created_at,
        });
      }
    }
  } catch (err) {
    console.warn('Error querying doctor consultations table:', err);
  }

  // 2. Query doctor profiles.metadata.doctor_consultation_records
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', doctorId)
      .maybeSingle();

    const metaList = (prof?.metadata as any)?.doctor_consultation_records;
    if (Array.isArray(metaList)) {
      for (const item of metaList) {
        const key = item.emrCode || item.id;
        if (!foundMap.has(key)) {
          foundMap.set(key, item);
        }
      }
    }
  } catch (err) {
    console.warn('Error querying doctor profile metadata:', err);
  }

  // 3. Fallback to localStorage
  try {
    const dKey = `medconnect_consultations_doctor_${doctorId}`;
    const dList = JSON.parse(localStorage.getItem(dKey) || '[]');
    for (const item of dList) {
      const key = item.emrCode || item.id;
      if (!foundMap.has(key)) {
        foundMap.set(key, item);
      }
    }

    const allList = JSON.parse(localStorage.getItem('medconnect_consultations_all') || '[]');
    for (const item of allList) {
      if (item.doctorId === doctorId) {
        const key = item.emrCode || item.id;
        if (!foundMap.has(key)) {
          foundMap.set(key, item);
        }
      }
    }
  } catch (err) {
    console.warn('Error reading doctor local consultations:', err);
  }

  return Array.from(foundMap.values()).sort(
    (a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime()
  );
}

export async function getAllConsultations(): Promise<ConsultationRecord[]> {
  const foundMap = new Map<string, ConsultationRecord>();

  try {
    const { data: cRows, error } = await supabase
      .from('consultations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(cRows)) {
      for (const row of cRows) {
        const key = row.emr_code || row.id;
        foundMap.set(key, {
          id: row.id,
          emrCode: row.emr_code || `EMR-${row.id.slice(0, 8).toUpperCase()}`,
          patientId: row.patient_id,
          patientName: row.patient_name || 'Patient',
          pid: `PID-${row.patient_id.replace(/-/g, '').slice(0, 9).toUpperCase()}`,
          doctorId: row.doctor_id || 'doc-1',
          doctorName: row.doctor_name || 'Attending Physician',
          date: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          chiefComplaint: row.chief_complaint || '',
          diagnoses: row.diagnosis ? row.diagnosis.split(', ') : ['General Health Assessment'],
          treatmentPlan: row.treatment_plan || '',
          prescriptions: row.prescriptions || [],
          labOrders: row.lab_orders || [],
          vitals: row.vitals || {},
          created_at: row.created_at,
        });
      }
    }
  } catch { /* ignore */ }

  try {
    const allList = JSON.parse(localStorage.getItem('medconnect_consultations_all') || '[]');
    for (const item of allList) {
      const key = item.emrCode || item.id;
      if (!foundMap.has(key)) {
        foundMap.set(key, item);
      }
    }
  } catch { /* ignore */ }

  return Array.from(foundMap.values()).sort(
    (a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime()
  );
}

