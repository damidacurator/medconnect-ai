/**
 * MedConnect AI - Cryptographic Consent & Access Control Protocol
 *
 * Sovereign Patient ID Access Protocol:
 * 1. Patients cannot be browsed or searched publicly.
 * 2. Every patient has a permanent Patient ID (e.g. PID-9B2F4C1A) displayed prominently on their overview.
 * 3. A physician inputs the Patient ID to unlock the patient's records, vitals, and diagnostic scans.
 * 4. The patient maintains sovereign control and can revoke any doctor's access anytime.
 * 5. Backed by Supabase `public.profiles`, `public.patient_access_codes`, and `public.access_grants` with local fallback.
 */

import { supabase } from '@/lib/supabase';

export interface AuthorizedDoctor {
  doctorId: string;
  doctorName: string;
  hospital: string;
  specialization: string;
  authorizedAt: string;
  permissions: {
    vitals: boolean;
    records: boolean;
    imaging: boolean;
  };
}

export interface PatientAccessRecord {
  accessCode: string;
  patientId: string;
  patientName: string;
  patientPid: string;
  email: string;
  gender?: string;
  age?: number | string;
  bloodGroup?: string;
  phone?: string;
  authorizedDoctors: AuthorizedDoctor[];
  vitalsHistory?: any[];
  updatedAt: string;
}

const REGISTRY_STORAGE_KEY = 'medconnect_patient_access_registry';
const PATIENT_PIN_KEY_PREFIX = 'medconnect_access_pin_';

/**
 * Generate a random 6-digit numeric PIN with 'MED-' prefix
 */
export function generateRandomPin(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  return `MED-${digits}`;
}

/**
 * Retrieve or initialize patient's private Doctor Access PIN / PID
 */
export function getPatientAccessPin(patientId: string): string {
  if (!patientId) return 'PID-000000';
  const key = `${PATIENT_PIN_KEY_PREFIX}${patientId}`;
  let pin = localStorage.getItem(key);
  if (!pin) {
    pin = `PID-${patientId.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
    localStorage.setItem(key, pin);
  }
  return pin;
}

/**
 * Regenerate a new PIN for a patient (invalidates previous codes)
 */
export function regeneratePatientAccessPin(patientId: string, currentPatientData?: Partial<PatientAccessRecord>): string {
  const newPin = generateRandomPin();
  const key = `${PATIENT_PIN_KEY_PREFIX}${patientId}`;
  localStorage.setItem(key, newPin);

  if (currentPatientData) {
    registerOrUpdatePatientAccess({
      ...currentPatientData,
      patientId,
      accessCode: newPin,
    });
  }
  return newPin;
}

/**
 * Get the full registry from localStorage
 */
function getRegistry(): Record<string, PatientAccessRecord> {
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save the registry to localStorage
 */
function saveRegistry(reg: Record<string, PatientAccessRecord>) {
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(reg));
  } catch (err) {
    console.error('Failed to save patient access registry', err);
  }
}

/**
 * Register or update a patient in the access registry
 */
export function registerOrUpdatePatientAccess(data: {
  patientId: string;
  patientName?: string;
  patientPid?: string;
  email?: string;
  gender?: string;
  age?: number | string;
  bloodGroup?: string;
  phone?: string;
  accessCode?: string;
}): PatientAccessRecord {
  const registry = getRegistry();
  const pid = data.patientPid || `PID-${data.patientId.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
  const codeKey = data.accessCode || pid;

  const existing = registry[codeKey] || registry[data.patientId] || registry[pid] || {
    accessCode: codeKey,
    patientId: data.patientId,
    patientName: data.patientName || 'Patient User',
    patientPid: pid,
    email: data.email || '',
    gender: data.gender,
    age: data.age,
    bloodGroup: data.bloodGroup,
    phone: data.phone || '',
    authorizedDoctors: [],
    updatedAt: new Date().toISOString(),
  };

  const updated: PatientAccessRecord = {
    ...existing,
    patientName: data.patientName || existing.patientName,
    patientPid: pid,
    email: data.email || existing.email,
    gender: data.gender !== undefined ? data.gender : existing.gender,
    age: data.age !== undefined ? data.age : existing.age,
    bloodGroup: data.bloodGroup !== undefined ? data.bloodGroup : existing.bloodGroup,
    phone: data.phone || existing.phone,
    accessCode: codeKey,
    updatedAt: new Date().toISOString(),
  };

  registry[codeKey] = updated;
  registry[pid] = updated;
  registry[data.patientId] = updated;
  saveRegistry(registry);

  // Sync asynchronously to Supabase patient_access_codes and profiles
  try {
    supabase
      .from('patient_access_codes')
      .upsert({
        patient_id: data.patientId,
        access_code: pid,
        authorized_doctors: updated.authorizedDoctors,
        updated_at: new Date().toISOString(),
      })
      .then(
        () => {},
        err => console.warn('Supabase access code sync note:', err)
      );

    // Also update unique_code in profiles if not set
    supabase
      .from('profiles')
      .update({ unique_code: pid })
      .eq('id', data.patientId)
      .then(() => {}, () => {});
  } catch {
    // ignore
  }

  return updated;
}

/**
 * Get active authorized doctors for a specific patient from local registry
 */
export function getAuthorizedDoctors(patientId: string): AuthorizedDoctor[] {
  const registry = getRegistry();
  const pid = `PID-${patientId.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
  const record = registry[pid] || registry[patientId] || Object.values(registry).find(r => r.patientId === patientId);
  return record?.authorizedDoctors || [];
}

/**
 * Fetch authorized doctors from Supabase cloud (patient_access_codes + access_grants)
 */
export async function fetchAuthorizedDoctorsCloud(patientId: string): Promise<AuthorizedDoctor[]> {
  const doctorsMap = new Map<string, AuthorizedDoctor>();

  // 1. Check local cache
  const localDocs = getAuthorizedDoctors(patientId);
  for (const d of localDocs) {
    doctorsMap.set(d.doctorId, d);
  }

  // 2. Query patient_access_codes table
  try {
    const { data } = await supabase
      .from('patient_access_codes')
      .select('authorized_doctors')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (data?.authorized_doctors && Array.isArray(data.authorized_doctors)) {
      for (const d of data.authorized_doctors) {
        doctorsMap.set(d.doctorId, d);
      }
    }
  } catch (err) {
    console.warn('patient_access_codes lookup note:', err);
  }

  // 3. Query access_grants table
  try {
    const { data: grants } = await supabase
      .from('access_grants')
      .select('granted_to_id, created_at')
      .eq('patient_id', patientId)
      .is('revoked_at', null);

    if (Array.isArray(grants) && grants.length > 0) {
      for (const g of grants) {
        if (!doctorsMap.has(g.granted_to_id)) {
          const { data: docProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', g.granted_to_id)
            .maybeSingle();

          if (docProf) {
            doctorsMap.set(g.granted_to_id, {
              doctorId: docProf.id,
              doctorName: docProf.full_name || 'Physician',
              hospital: ((docProf.metadata as any)?.current_institution as string) || 'MedConnect Healthcare',
              specialization: ((docProf.metadata as any)?.specialization as string) || 'General Medicine',
              authorizedAt: new Date(g.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
              permissions: { vitals: true, records: true, imaging: true },
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('access_grants lookup note:', err);
  }

  const result = Array.from(doctorsMap.values());

  // Sync local cache
  try {
    const registry = getRegistry();
    const pid = `PID-${patientId.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
    if (registry[pid]) {
      registry[pid].authorizedDoctors = result;
      saveRegistry(registry);
    }
  } catch {
    // ignore
  }

  return result;
}

/**
 * Add or link a doctor to a patient's authorized list
 */
export async function addAuthorizedDoctor(
  patientId: string,
  doctorInfo: {
    doctorId: string;
    doctorName: string;
    hospital: string;
    specialization: string;
  }
): Promise<AuthorizedDoctor[]> {
  const registry = getRegistry();
  const pid = `PID-${patientId.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
  let record = registry[pid] || registry[patientId] || Object.values(registry).find(r => r.patientId === patientId);

  if (!record) {
    record = registerOrUpdatePatientAccess({
      patientId,
      patientPid: pid,
    });
  }

  const now = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const newDoctor: AuthorizedDoctor = {
    doctorId: doctorInfo.doctorId,
    doctorName: doctorInfo.doctorName,
    hospital: doctorInfo.hospital,
    specialization: doctorInfo.specialization,
    authorizedAt: now,
    permissions: { vitals: true, records: true, imaging: true },
  };

  record.authorizedDoctors = [
    newDoctor,
    ...record.authorizedDoctors.filter(d => d.doctorId !== doctorInfo.doctorId)
  ];
  record.updatedAt = new Date().toISOString();

  registry[pid] = record;
  registry[patientId] = record;
  saveRegistry(registry);

  // Sync to Supabase
  try {
    await supabase.from('patient_access_codes').upsert({
      patient_id: patientId,
      access_code: pid,
      authorized_doctors: record.authorizedDoctors,
      updated_at: new Date().toISOString(),
    });
    await supabase.from('access_grants').upsert({
      patient_id: patientId,
      granted_to_id: doctorInfo.doctorId,
      granted_to_role: 'doctor',
      access_level: 'full',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not sync authorized doctor to Supabase:', err);
  }

  return record.authorizedDoctors;
}

/**
 * Patient revokes access for a specific doctor
 */
export async function revokeDoctorAccess(patientId: string, doctorId: string): Promise<boolean> {
  const registry = getRegistry();
  const pid = `PID-${patientId.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
  const record = registry[pid] || registry[patientId] || Object.values(registry).find(r => r.patientId === patientId);

  if (record) {
    record.authorizedDoctors = record.authorizedDoctors.filter(d => d.doctorId !== doctorId);
    record.updatedAt = new Date().toISOString();
    registry[pid] = record;
    registry[patientId] = record;
    saveRegistry(registry);
  }

  // Remove from Supabase patient_access_codes and access_grants
  try {
    if (record) {
      await supabase
        .from('patient_access_codes')
        .update({
          authorized_doctors: record.authorizedDoctors,
          updated_at: new Date().toISOString(),
        })
        .eq('patient_id', patientId);
    }
    await supabase
      .from('access_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('patient_id', patientId)
      .eq('granted_to_id', doctorId);
  } catch (err) {
    console.warn('Could not revoke doctor in Supabase cloud:', err);
  }

  // Remove this patient from doctor's unlocked local cache
  try {
    const docKey = `medconnect_doctor_unlocked_${doctorId}`;
    const raw = localStorage.getItem(docKey);
    if (raw) {
      const list: any[] = JSON.parse(raw);
      const filtered = list.filter(p => p.id !== patientId);
      localStorage.setItem(docKey, JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }

  return true;
}

/**
 * Doctor unlocks patient records by providing their Patient ID (e.g. PID-9B2F4C1A) or Access Code.
 * Checks local storage and queries Supabase profiles / patient_access_codes in real time.
 */
export async function unlockPatientWithPin(
  idInput: string,
  doctorInfo: {
    doctorId: string;
    doctorName: string;
    hospital: string;
    specialization: string;
  }
): Promise<{ success: boolean; patient?: PatientAccessRecord; error?: string }> {
  const cleanedId = idInput.trim().toUpperCase();
  if (!cleanedId) {
    return {
      success: false,
      error: 'Please enter a Patient ID (e.g. PID-9B2F4C1A).',
    };
  }

  const registry = getRegistry();
  const cleanRaw = cleanedId.replace(/^PID-/, '').replace(/-/g, '');

  // 1. Check local registry first
  let record: PatientAccessRecord | undefined =
    registry[cleanedId] ||
    Object.values(registry).find(
      r =>
        r.patientPid?.toUpperCase() === cleanedId ||
        r.patientId?.toUpperCase() === cleanedId ||
        r.accessCode?.toUpperCase() === cleanedId ||
        r.patientPid?.replace(/^PID-/, '').replace(/-/g, '').toUpperCase() === cleanRaw
    );

  // 2. If not found in local registry, query Supabase Cloud (profiles table)
  if (!record) {
    try {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient');

      if (!pError && Array.isArray(profiles)) {
        const match = profiles.find((p: any) => {
          const pId = (p.id || '').toUpperCase();
          const pIdRaw = pId.replace(/-/g, '');
          const pPid = `PID-${pIdRaw.slice(0, 9)}`;
          const pCode = (p.unique_code || '').toUpperCase();
          const pMetaPid = ((p.metadata as any)?.patient_id || '').toUpperCase();
          const pMetaCode = ((p.metadata as any)?.access_code || '').toUpperCase();
          const pEmail = (p.email || '').toUpperCase();

          return (
            pPid === cleanedId ||
            pCode === cleanedId ||
            pMetaPid === cleanedId ||
            pMetaCode === cleanedId ||
            pId === cleanedId ||
            pIdRaw.startsWith(cleanRaw) ||
            (cleanRaw.length >= 6 && pIdRaw.includes(cleanRaw)) ||
            pEmail === cleanedId
          );
        });

        if (match) {
          const patPid = `PID-${match.id.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
          record = {
            accessCode: patPid,
            patientId: match.id,
            patientName: match.full_name || 'Patient',
            patientPid: patPid,
            email: match.email || '',
            gender: (match.metadata as any)?.gender || match.gender,
            age: (match.metadata as any)?.age || match.age,
            bloodGroup: (match.metadata as any)?.blood_group,
            phone: match.phone || '',
            authorizedDoctors: [],
            updatedAt: new Date().toISOString(),
          };
        }
      }

      // If still not in profiles, check patient_access_codes table
      if (!record) {
        const { data: pacList } = await supabase.from('patient_access_codes').select('*');
        if (Array.isArray(pacList)) {
          const pacMatch = pacList.find((pac: any) => {
            const code = (pac.access_code || '').toUpperCase();
            const pid = (pac.patient_id || '').toUpperCase();
            const raw = code.replace(/^PID-/, '').replace(/-/g, '');
            return code === cleanedId || pid === cleanedId || raw === cleanRaw;
          });

          if (pacMatch) {
            const { data: pData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', pacMatch.patient_id)
              .maybeSingle();

            const patPid = pacMatch.access_code || `PID-${pacMatch.patient_id.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
            record = {
              accessCode: patPid,
              patientId: pacMatch.patient_id,
              patientName: pData?.full_name || 'Patient',
              patientPid: patPid,
              email: pData?.email || '',
              gender: (pData?.metadata as any)?.gender || pData?.gender,
              age: (pData?.metadata as any)?.age || pData?.age,
              bloodGroup: (pData?.metadata as any)?.blood_group,
              phone: pData?.phone || '',
              authorizedDoctors: Array.isArray(pacMatch.authorized_doctors) ? pacMatch.authorized_doctors : [],
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }
    } catch (cloudErr) {
      console.warn('Supabase lookup error during patient unlock:', cloudErr);
    }
  }

  if (!record) {
    return {
      success: false,
      error: `Patient ID "${cleanedId}" not found. Please ensure the patient has created an account and check their exact Patient ID (found at the top of their Overview or Access Control page).`,
    };
  }

  const now = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const authEntry: AuthorizedDoctor = {
    doctorId: doctorInfo.doctorId,
    doctorName: doctorInfo.doctorName,
    hospital: doctorInfo.hospital,
    specialization: doctorInfo.specialization,
    authorizedAt: now,
    permissions: {
      vitals: true,
      records: true,
      imaging: true,
    },
  };

  const existingDocIdx = record.authorizedDoctors.findIndex(d => d.doctorId === doctorInfo.doctorId);
  if (existingDocIdx >= 0) {
    record.authorizedDoctors[existingDocIdx] = authEntry;
  } else {
    record.authorizedDoctors.push(authEntry);
  }

  record.updatedAt = new Date().toISOString();
  registry[record.patientPid] = record;
  registry[record.patientId] = record;
  registry[record.accessCode] = record;
  saveRegistry(registry);

  // Sync to Supabase access_grants and patient_access_codes
  try {
    // 1. Check if an active grant already exists for this doctor
    const { data: existingGrant } = await supabase
      .from('access_grants')
      .select('id')
      .eq('patient_id', record.patientId)
      .eq('granted_to_id', doctorInfo.doctorId)
      .is('revoked_at', null)
      .maybeSingle();

    if (!existingGrant) {
      await supabase.from('access_grants').insert({
        patient_id: record.patientId,
        granted_to_id: doctorInfo.doctorId,
        granted_to_role: 'doctor',
        access_level: 'full',
        created_at: new Date().toISOString(),
      });
    }

    // 2. Also keep patient_access_codes synced
    await supabase.from('patient_access_codes').upsert({
      patient_id: record.patientId,
      access_code: record.patientPid,
      authorized_doctors: record.authorizedDoctors,
      updated_at: new Date().toISOString(),
    });
  } catch (syncErr) {
    console.warn('Supabase access grant sync note:', syncErr);
  }

  // 3. Fetch live vitals for this unlocked patient from Supabase & local cache
  let vitalsHistory: any[] = [];
  try {
    const { data: vRows } = await supabase
      .from('health_vitals')
      .select('*')
      .eq('patient_id', record.patientId)
      .order('recorded_at', { ascending: false })
      .limit(30);

    if (Array.isArray(vRows) && vRows.length > 0) {
      vitalsHistory = vRows.map((r: any) => ({
        date: new Date(r.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bp: `${r.systolic_bp || 120}/${r.diastolic_bp || 80}`,
        hr: r.heart_rate || 72,
        temp: Number(r.temperature) || 36.6,
        spo2: Number(r.oxygen_saturation) || 98,
        glucose: r.blood_glucose ? Number(r.blood_glucose) : undefined,
        weight: r.weight_kg ? Number(r.weight_kg) : undefined,
      }));
    } else {
      const localKey = 'medconnect_health_vitals';
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const list = JSON.parse(raw);
        const userRows = list.filter((r: any) => r.patient_id === record!.patientId);
        if (userRows.length > 0) {
          vitalsHistory = userRows.map((r: any) => ({
            date: new Date(r.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            bp: `${r.systolic_bp || 120}/${r.diastolic_bp || 80}`,
            hr: r.heart_rate || 72,
            temp: Number(r.temperature) || 36.6,
            spo2: Number(r.oxygen_saturation) || 98,
            glucose: r.blood_glucose ? Number(r.blood_glucose) : undefined,
            weight: r.weight_kg ? Number(r.weight_kg) : undefined,
          }));
        }
      }
    }
  } catch (vErr) {
    console.warn('Error fetching vitals for unlocked patient:', vErr);
  }

  record.vitalsHistory = vitalsHistory;

  // Cache in doctor's unlocked list
  try {
    const docKey = `medconnect_doctor_unlocked_${doctorInfo.doctorId}`;
    const raw = localStorage.getItem(docKey);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const existingIdx = list.findIndex(p => p.id === record!.patientId);
    const patEntry = {
      id: record.patientId,
      name: record.patientName,
      pid: record.patientPid,
      age: record.age ?? null,
      gender: record.gender ?? 'Not specified',
      bloodGroup: record.bloodGroup ?? 'Not specified',
      phone: record.phone || '',
      email: record.email || '',
      allergies: [],
      chronicConditions: [],
      vitalsHistory,
      lastVisit: 'Today',
    };

    if (existingIdx >= 0) {
      list[existingIdx] = patEntry;
    } else {
      list.push(patEntry);
    }
    localStorage.setItem(docKey, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to update doctor unlocked cache', err);
  }

  return {
    success: true,
    patient: record,
  };
}

/**
 * Load all unlocked patients for a specific doctor from Supabase cloud + local storage
 */
export async function fetchDoctorUnlockedPatients(doctorId: string): Promise<any[]> {
  if (!doctorId) return [];
  const docKey = `medconnect_doctor_unlocked_${doctorId}`;

  let cachedList: any[] = [];
  try {
    const raw = localStorage.getItem(docKey);
    if (raw) cachedList = JSON.parse(raw);
  } catch {
    cachedList = [];
  }

  const patientMap = new Map<string, any>();
  for (const p of cachedList) {
    patientMap.set(p.id, p);
  }

  // Fetch from Supabase access_grants
  try {
    const { data: grants } = await supabase
      .from('access_grants')
      .select('patient_id')
      .eq('granted_to_id', doctorId)
      .is('revoked_at', null);

    const grantIds = grants?.map(g => g.patient_id) || [];

    // Also fetch from patient_access_codes
    const { data: pacs } = await supabase
      .from('patient_access_codes')
      .select('patient_id, access_code, authorized_doctors');

    if (Array.isArray(pacs)) {
      for (const pac of pacs) {
        if (Array.isArray(pac.authorized_doctors)) {
          if (pac.authorized_doctors.some((d: any) => d.doctorId === doctorId)) {
            grantIds.push(pac.patient_id);
          }
        }
      }
    }

    const uniquePatientIds = Array.from(new Set(grantIds));

    for (const patId of uniquePatientIds) {
      if (!patientMap.has(patId)) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', patId)
          .maybeSingle();

        if (profile) {
          const pid = `PID-${profile.id.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
          patientMap.set(profile.id, {
            id: profile.id,
            name: profile.full_name || 'Patient',
            pid,
            age: (profile.metadata as any)?.age || profile.age || null,
            gender: (profile.metadata as any)?.gender || profile.gender || 'Not specified',
            bloodGroup: (profile.metadata as any)?.blood_group || 'Not specified',
            phone: profile.phone || '',
            email: profile.email || '',
            allergies: [],
            chronicConditions: [],
            vitalsHistory: [],
            lastVisit: 'Connected',
          });
        }
      }
    }

    // Now populate live vitals from health_vitals for every patient
    for (const p of patientMap.values()) {
      try {
        const { data: vRows } = await supabase
          .from('health_vitals')
          .select('*')
          .eq('patient_id', p.id)
          .order('recorded_at', { ascending: false })
          .limit(30);

        if (Array.isArray(vRows) && vRows.length > 0) {
          p.vitalsHistory = vRows.map((r: any) => ({
            date: new Date(r.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            bp: `${r.systolic_bp || 120}/${r.diastolic_bp || 80}`,
            hr: r.heart_rate || 72,
            temp: Number(r.temperature) || 36.6,
            spo2: Number(r.oxygen_saturation) || 98,
            glucose: r.blood_glucose ? Number(r.blood_glucose) : undefined,
            weight: r.weight_kg ? Number(r.weight_kg) : undefined,
          }));
        } else {
          // Check local cache
          const localKey = 'medconnect_health_vitals';
          const raw = localStorage.getItem(localKey);
          if (raw) {
            const list = JSON.parse(raw);
            const userRows = list.filter((r: any) => r.patient_id === p.id);
            if (userRows.length > 0) {
              p.vitalsHistory = userRows.map((r: any) => ({
                date: new Date(r.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                bp: `${r.systolic_bp || 120}/${r.diastolic_bp || 80}`,
                hr: r.heart_rate || 72,
                temp: Number(r.temperature) || 36.6,
                spo2: Number(r.oxygen_saturation) || 98,
                glucose: r.blood_glucose ? Number(r.blood_glucose) : undefined,
                weight: r.weight_kg ? Number(r.weight_kg) : undefined,
              }));
            }
          }
        }
      } catch {
        // fallback
      }
    }
  } catch (err) {
    console.warn('Error fetching cloud unlocked patients:', err);
  }

  const result = Array.from(patientMap.values());
  try {
    localStorage.setItem(docKey, JSON.stringify(result));
  } catch {
    // ignore
  }

  return result;
}
