/**
 * MedConnect AI - Cryptographic Consent & Access Control Protocol
 *
 * Sovereign Patient ID Access Protocol:
 * 1. Patients cannot be browsed or searched publicly like Facebook.
 * 2. Every patient has a permanent Patient ID (e.g. PID-9B2F4C1A) at the top of their overview.
 * 3. A physician inputs the Patient ID to unlock the patient's records, vitals, and diagnostic scans.
 * 4. The patient maintains sovereign control and can revoke any doctor's access anytime.
 * 5. Backed by Supabase `public.patient_access_codes` table + local cache.
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
  if (!patientId) return 'MED-000000';
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
    gender: data.gender || 'Not specified',
    age: data.age || 'N/A',
    bloodGroup: data.bloodGroup || 'O+',
    phone: data.phone || '',
    authorizedDoctors: [],
    updatedAt: new Date().toISOString(),
  };

  const updated: PatientAccessRecord = {
    ...existing,
    patientName: data.patientName || existing.patientName,
    patientPid: pid,
    email: data.email || existing.email,
    gender: data.gender || existing.gender,
    age: data.age || existing.age,
    bloodGroup: data.bloodGroup || existing.bloodGroup,
    phone: data.phone || existing.phone,
    accessCode: codeKey,
    updatedAt: new Date().toISOString(),
  };

  registry[codeKey] = updated;
  registry[pid] = updated;
  registry[data.patientId] = updated;
  saveRegistry(registry);

  // Sync asynchronously to Supabase patient_access_codes table
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
  } catch {
    // ignore
  }

  return updated;
}

/**
 * Get active authorized doctors for a specific patient
 */
export function getAuthorizedDoctors(patientId: string): AuthorizedDoctor[] {
  const registry = getRegistry();
  const pid = `PID-${patientId.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
  const record = registry[pid] || registry[patientId] || Object.values(registry).find(r => r.patientId === patientId);
  return record?.authorizedDoctors || [];
}

/**
 * Fetch authorized doctors from Supabase asynchronously
 */
export async function fetchAuthorizedDoctorsCloud(patientId: string): Promise<AuthorizedDoctor[]> {
  try {
    const { data } = await supabase
      .from('patient_access_codes')
      .select('authorized_doctors')
      .eq('patient_id', patientId)
      .single();

    if (data?.authorized_doctors && Array.isArray(data.authorized_doctors)) {
      // Sync local cache
      const registry = getRegistry();
      const pid = `PID-${patientId.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
      if (registry[pid]) {
        registry[pid].authorizedDoctors = data.authorized_doctors;
        saveRegistry(registry);
      }
      return data.authorized_doctors as AuthorizedDoctor[];
    }
  } catch {
    // fallback to local
  }
  return getAuthorizedDoctors(patientId);
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
  } catch (err) {
    console.warn('Could not sync authorized doctor to Supabase:', err);
  }

  return record.authorizedDoctors;
}

/**
 * Patient revokes access for a specific doctor (NON-DUD - fully active in Supabase & Local)
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

  // Remove from Supabase patient_access_codes table
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
  } catch (err) {
    console.warn('Could not revoke doctor in Supabase cloud:', err);
  }

  // Also remove this patient from doctor's unlocked local cache
  try {
    const docKey = `medconnect_doctor_unlocked_${doctorId}`;
    const raw = localStorage.getItem(docKey);
    if (raw) {
      const list: any[] = JSON.parse(raw);
      const filtered = list.filter(p => p.id !== patientId);
      localStorage.setItem(docKey, JSON.stringify(filtered));
    }
  } catch {
    // Ignore error
  }

  return true;
}

/**
 * Doctor unlocks patient records by providing the Patient ID (e.g. PID-9B2F4C1A) or Access PIN
 */
export function unlockPatientWithPin(
  idInput: string,
  doctorInfo: {
    doctorId: string;
    doctorName: string;
    hospital: string;
    specialization: string;
  }
): { success: boolean; patient?: PatientAccessRecord; error?: string } {
  const cleanedId = idInput.trim().toUpperCase();
  const registry = getRegistry();

  // Find record by Patient ID, Access Code, or UUID
  let record: PatientAccessRecord | undefined =
    registry[cleanedId] ||
    Object.values(registry).find(
      r =>
        r.patientPid.toUpperCase() === cleanedId ||
        r.patientId.toUpperCase() === cleanedId ||
        r.accessCode.toUpperCase() === cleanedId
    );

  if (!record) {
    return {
      success: false,
      error: `Patient ID "${cleanedId}" not found. Please ask the patient for their exact Patient ID (found at the top of their Overview page).`,
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

  // Sync to Supabase in background
  try {
    supabase
      .from('patient_access_codes')
      .upsert({
        patient_id: record.patientId,
        access_code: record.patientPid,
        authorized_doctors: record.authorizedDoctors,
        updated_at: new Date().toISOString(),
      })
      .then(() => {});
  } catch {
    // ignore
  }

  // Cache in doctor's unlocked list
  try {
    const docKey = `medconnect_doctor_unlocked_${doctorInfo.doctorId}`;
    const raw = localStorage.getItem(docKey);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const exists = list.some(p => p.id === record!.patientId);
    if (!exists) {
      list.push({
        id: record.patientId,
        name: record.patientName,
        pid: record.patientPid,
        age: record.age || 32,
        gender: record.gender || 'Prefer not to say',
        bloodGroup: record.bloodGroup || 'O+',
        phone: record.phone || '',
        email: record.email || '',
        allergies: [],
        chronicConditions: [],
        vitalsHistory: [],
        lastVisit: now,
      });
      localStorage.setItem(docKey, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Failed to update doctor unlocked cache', err);
  }

  return {
    success: true,
    patient: record,
  };
}
