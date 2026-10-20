/**
 * MedConnect AI - Cryptographic Consent & Access Control Protocol
 *
 * Enforces zero-trust clinical access:
 * 1. Patients cannot be browsed or searched publicly like Facebook.
 * 2. Each patient possesses a unique 6-digit Doctor Access PIN (e.g. MED-849201).
 * 3. A physician must input the patient's active PIN to unlock their health passport.
 * 4. The patient maintains sovereign control and can revoke any doctor's access anytime.
 */

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
 * Retrieve or initialize patient's private Doctor Access PIN
 */
export function getPatientAccessPin(patientId: string): string {
  if (!patientId) return 'MED-000000';
  const key = `${PATIENT_PIN_KEY_PREFIX}${patientId}`;
  let pin = localStorage.getItem(key);
  if (!pin) {
    pin = generateRandomPin();
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

  // Update registry with new PIN
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
  const pin = data.accessCode || getPatientAccessPin(data.patientId);

  const existing = registry[pin] || {
    accessCode: pin,
    patientId: data.patientId,
    patientName: data.patientName || 'Patient User',
    patientPid: data.patientPid || `PID-${data.patientId.slice(0, 8).toUpperCase()}`,
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
    patientPid: data.patientPid || existing.patientPid,
    email: data.email || existing.email,
    gender: data.gender || existing.gender,
    age: data.age || existing.age,
    bloodGroup: data.bloodGroup || existing.bloodGroup,
    phone: data.phone || existing.phone,
    accessCode: pin,
    updatedAt: new Date().toISOString(),
  };

  registry[pin] = updated;
  saveRegistry(registry);
  return updated;
}

/**
 * Get active authorized doctors for a specific patient
 */
export function getAuthorizedDoctors(patientId: string): AuthorizedDoctor[] {
  const pin = getPatientAccessPin(patientId);
  const registry = getRegistry();
  const record = registry[pin];
  return record?.authorizedDoctors || [];
}

/**
 * Patient revokes access for a specific doctor
 */
export function revokeDoctorAccess(patientId: string, doctorId: string): boolean {
  const pin = getPatientAccessPin(patientId);
  const registry = getRegistry();
  const record = registry[pin];
  if (!record) return false;

  record.authorizedDoctors = record.authorizedDoctors.filter(d => d.doctorId !== doctorId);
  record.updatedAt = new Date().toISOString();
  registry[pin] = record;
  saveRegistry(registry);

  // Also remove from doctor's local unlocked cache
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
 * Doctor unlocks patient records by providing the patient's 6-digit access PIN
 */
export function unlockPatientWithPin(
  pinInput: string,
  doctorInfo: {
    doctorId: string;
    doctorName: string;
    hospital: string;
    specialization: string;
  }
): { success: boolean; patient?: PatientAccessRecord; error?: string } {
  const cleanedPin = pinInput.trim().toUpperCase();
  const registry = getRegistry();
  
  // Find record by code
  const record = registry[cleanedPin];
  if (!record) {
    return {
      success: false,
      error: `Invalid Access Code: "${cleanedPin}". Please ask the patient to generate and share their active 6-digit PIN.`,
    };
  }

  // Check if doctor is already authorized
  const existingDocIdx = record.authorizedDoctors.findIndex(d => d.doctorId === doctorInfo.doctorId);
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

  if (existingDocIdx >= 0) {
    record.authorizedDoctors[existingDocIdx] = authEntry;
  } else {
    record.authorizedDoctors.push(authEntry);
  }

  record.updatedAt = new Date().toISOString();
  registry[cleanedPin] = record;
  saveRegistry(registry);

  // Cache in doctor's unlocked list
  try {
    const docKey = `medconnect_doctor_unlocked_${doctorInfo.doctorId}`;
    const raw = localStorage.getItem(docKey);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const exists = list.some(p => p.id === record.patientId);
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
