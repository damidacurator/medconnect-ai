export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'patient' | 'doctor' | 'institution';

export type AllergyType = 'food' | 'drug' | 'environmental' | 'latex' | 'animal' | 'other';
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening';

export type MedicalConditionStatus = 'active' | 'resolved' | 'managed';

export type HospitalCategory =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'specialist'
  | 'clinic'
  | 'pharmacy'
  | 'laboratory';

export type InstitutionOwnership = 'government' | 'private' | 'ngo' | 'military';

export type AppointmentType = 'virtual' | 'physical' | 'emergency';
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ConsultationStatus = 'in_progress' | 'completed' | 'cancelled';

export type PrescriptionRoute = 'oral' | 'iv' | 'im' | 'topical' | 'inhaled' | 'other';
export type PrescriptionStatus = 'active' | 'completed' | 'cancelled';

export type LabCategory = 'blood' | 'urinalysis' | 'imaging' | 'pathology' | 'other';
export type LabUrgency = 'routine' | 'urgent' | 'stat';
export type LabStatus = 'ordered' | 'in_progress' | 'completed' | 'cancelled';

export type SymptomSeverity = 'mild' | 'moderate' | 'severe';

export type AccessLevel = 'read' | 'write' | 'full';

export type AuditAction = 'view' | 'create' | 'update' | 'delete';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          phone: string | null
          avatar_url: string | null
          unique_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: UserRole
          phone?: string | null
          avatar_url?: string | null
          unique_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          phone?: string | null
          avatar_url?: string | null
          unique_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patient_details: {
        Row: {
          id: string
          patient_id: string
          date_of_birth: string | null
          gender: string | null
          marital_status: string | null
          nationality: string | null
          national_id: string | null
          passport_number: string | null
          home_address: string | null
          occupation: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          blood_group: string | null
          genotype: string | null
          height_cm: number | null
          weight_kg: number | null
          bmi: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          date_of_birth?: string | null
          gender?: string | null
          marital_status?: string | null
          nationality?: string | null
          national_id?: string | null
          passport_number?: string | null
          home_address?: string | null
          occupation?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          blood_group?: string | null
          genotype?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          bmi?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          date_of_birth?: string | null
          gender?: string | null
          marital_status?: string | null
          nationality?: string | null
          national_id?: string | null
          passport_number?: string | null
          home_address?: string | null
          occupation?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          blood_group?: string | null
          genotype?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          bmi?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      patient_lifestyle: {
        Row: {
          id: string
          patient_id: string
          smoking: boolean
          alcohol: boolean
          exercise_frequency: string | null
          diet_type: string | null
          sleep_hours: number | null
          drug_use: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          smoking?: boolean
          alcohol?: boolean
          exercise_frequency?: string | null
          diet_type?: string | null
          sleep_hours?: number | null
          drug_use?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          smoking?: boolean
          alcohol?: boolean
          exercise_frequency?: string | null
          diet_type?: string | null
          sleep_hours?: number | null
          drug_use?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      medical_history: {
        Row: {
          id: string
          patient_id: string
          condition_type: string
          condition_name: string
          diagnosed_date: string | null
          status: MedicalConditionStatus
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          condition_type: string
          condition_name: string
          diagnosed_date?: string | null
          status?: MedicalConditionStatus
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          condition_type?: string
          condition_name?: string
          diagnosed_date?: string | null
          status?: MedicalConditionStatus
          notes?: string | null
          created_at?: string
        }
      }
      allergies: {
        Row: {
          id: string
          patient_id: string
          allergy_type: AllergyType
          allergen: string
          severity: AllergySeverity
          reaction: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          allergy_type: AllergyType
          allergen: string
          severity: AllergySeverity
          reaction?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          allergy_type?: AllergyType
          allergen?: string
          severity?: AllergySeverity
          reaction?: string | null
          created_at?: string
        }
      }
      vaccinations: {
        Row: {
          id: string
          patient_id: string
          vaccine_name: string
          dose_number: number
          date_administered: string
          administered_by: string | null
          institution_id: string | null
          batch_number: string | null
          next_due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          vaccine_name: string
          dose_number?: number
          date_administered: string
          administered_by?: string | null
          institution_id?: string | null
          batch_number?: string | null
          next_due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          vaccine_name?: string
          dose_number?: number
          date_administered?: string
          administered_by?: string | null
          institution_id?: string | null
          batch_number?: string | null
          next_due_date?: string | null
          created_at?: string
        }
      }
      doctor_details: {
        Row: {
          id: string
          doctor_id: string
          medical_council_reg: string | null
          licence_number: string | null
          years_experience: number
          country: string | null
          languages: string[]
          qualifications: string[]
          specialization: string | null
          sub_specialization: string | null
          current_institution_id: string | null
          professional_memberships: string[]
          consultation_fee: number
          is_available_virtual: boolean
          is_available_physical: boolean
          is_available_emergency: boolean
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          medical_council_reg?: string | null
          licence_number?: string | null
          years_experience?: number
          country?: string | null
          languages?: string[]
          qualifications?: string[]
          specialization?: string | null
          sub_specialization?: string | null
          current_institution_id?: string | null
          professional_memberships?: string[]
          consultation_fee?: number
          is_available_virtual?: boolean
          is_available_physical?: boolean
          is_available_emergency?: boolean
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          medical_council_reg?: string | null
          licence_number?: string | null
          years_experience?: number
          country?: string | null
          languages?: string[]
          qualifications?: string[]
          specialization?: string | null
          sub_specialization?: string | null
          current_institution_id?: string | null
          professional_memberships?: string[]
          consultation_fee?: number
          is_available_virtual?: boolean
          is_available_physical?: boolean
          is_available_emergency?: boolean
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      doctor_schedule: {
        Row: {
          id: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_available?: boolean
          created_at?: string
        }
      }
      institution_details: {
        Row: {
          id: string
          institution_id: string
          registration_number: string | null
          government_licence: string | null
          medical_licence: string | null
          tax_number: string | null
          hospital_category: HospitalCategory | null
          ownership: InstitutionOwnership | null
          website: string | null
          emergency_number: string | null
          country: string | null
          state: string | null
          city: string | null
          gps_lat: number | null
          gps_lng: number | null
          address: string | null
          departments: string[]
          accreditations: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          registration_number?: string | null
          government_licence?: string | null
          medical_licence?: string | null
          tax_number?: string | null
          hospital_category?: HospitalCategory | null
          ownership?: InstitutionOwnership | null
          website?: string | null
          emergency_number?: string | null
          country?: string | null
          state?: string | null
          city?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          address?: string | null
          departments?: string[]
          accreditations?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          registration_number?: string | null
          government_licence?: string | null
          medical_licence?: string | null
          tax_number?: string | null
          hospital_category?: HospitalCategory | null
          ownership?: InstitutionOwnership | null
          website?: string | null
          emergency_number?: string | null
          country?: string | null
          state?: string | null
          city?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          address?: string | null
          departments?: string[]
          accreditations?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      institution_staff: {
        Row: {
          id: string
          institution_id: string
          doctor_id: string
          role: string | null
          department: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          doctor_id: string
          role?: string | null
          department?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          doctor_id?: string
          role?: string | null
          department?: string | null
          joined_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          unique_code: string | null
          patient_id: string
          doctor_id: string
          institution_id: string | null
          appointment_type: AppointmentType
          status: AppointmentStatus
          scheduled_at: string
          duration_minutes: number
          reason: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unique_code?: string | null
          patient_id: string
          doctor_id: string
          institution_id?: string | null
          appointment_type: AppointmentType
          status?: AppointmentStatus
          scheduled_at: string
          duration_minutes?: number
          reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unique_code?: string | null
          patient_id?: string
          doctor_id?: string
          institution_id?: string | null
          appointment_type?: AppointmentType
          status?: AppointmentStatus
          scheduled_at?: string
          duration_minutes?: number
          reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      consultations: {
        Row: {
          id: string
          unique_code: string | null
          appointment_id: string | null
          patient_id: string
          doctor_id: string
          institution_id: string | null
          chief_complaint: string | null
          history_of_present_illness: string | null
          examination_findings: string | null
          diagnosis: string[]
          differential_diagnosis: string[]
          treatment_plan: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          status: ConsultationStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unique_code?: string | null
          appointment_id?: string | null
          patient_id: string
          doctor_id: string
          institution_id?: string | null
          chief_complaint?: string | null
          history_of_present_illness?: string | null
          examination_findings?: string | null
          diagnosis?: string[]
          differential_diagnosis?: string[]
          treatment_plan?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          status?: ConsultationStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unique_code?: string | null
          appointment_id?: string | null
          patient_id?: string
          doctor_id?: string
          institution_id?: string | null
          chief_complaint?: string | null
          history_of_present_illness?: string | null
          examination_findings?: string | null
          diagnosis?: string[]
          differential_diagnosis?: string[]
          treatment_plan?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          status?: ConsultationStatus
          created_at?: string
          updated_at?: string
        }
      }
      prescriptions: {
        Row: {
          id: string
          unique_code: string | null
          consultation_id: string | null
          patient_id: string
          doctor_id: string
          medication_name: string
          dosage: string
          frequency: string
          duration: string
          route: PrescriptionRoute
          instructions: string | null
          quantity: number | null
          refills: number
          status: PrescriptionStatus
          created_at: string
        }
        Insert: {
          id?: string
          unique_code?: string | null
          consultation_id?: string | null
          patient_id: string
          doctor_id: string
          medication_name: string
          dosage: string
          frequency: string
          duration: string
          route?: PrescriptionRoute
          instructions?: string | null
          quantity?: number | null
          refills?: number
          status?: PrescriptionStatus
          created_at?: string
        }
        Update: {
          id?: string
          unique_code?: string | null
          consultation_id?: string | null
          patient_id?: string
          doctor_id?: string
          medication_name?: string
          dosage?: string
          frequency?: string
          duration?: string
          route?: PrescriptionRoute
          instructions?: string | null
          quantity?: number | null
          refills?: number
          status?: PrescriptionStatus
          created_at?: string
        }
      }
      lab_orders: {
        Row: {
          id: string
          unique_code: string | null
          consultation_id: string | null
          patient_id: string
          doctor_id: string
          institution_id: string | null
          test_name: string
          test_category: LabCategory
          urgency: LabUrgency
          status: LabStatus
          results: string | null
          result_date: string | null
          normal_range: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          unique_code?: string | null
          consultation_id?: string | null
          patient_id: string
          doctor_id: string
          institution_id?: string | null
          test_name: string
          test_category: LabCategory
          urgency?: LabUrgency
          status?: LabStatus
          results?: string | null
          result_date?: string | null
          normal_range?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          unique_code?: string | null
          consultation_id?: string | null
          patient_id?: string
          doctor_id?: string
          institution_id?: string | null
          test_name?: string
          test_category?: LabCategory
          urgency?: LabUrgency
          status?: LabStatus
          results?: string | null
          result_date?: string | null
          normal_range?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      health_vitals: {
        Row: {
          id: string
          patient_id: string
          recorded_by: string | null
          heart_rate: number | null
          systolic_bp: number | null
          diastolic_bp: number | null
          temperature: number | null
          oxygen_saturation: number | null
          respiratory_rate: number | null
          weight_kg: number | null
          height_cm: number | null
          bmi: number | null
          blood_glucose: number | null
          pain_level: number | null
          notes: string | null
          recorded_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          recorded_by?: string | null
          heart_rate?: number | null
          systolic_bp?: number | null
          diastolic_bp?: number | null
          temperature?: number | null
          oxygen_saturation?: number | null
          respiratory_rate?: number | null
          weight_kg?: number | null
          height_cm?: number | null
          bmi?: number | null
          blood_glucose?: number | null
          pain_level?: number | null
          notes?: string | null
          recorded_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          recorded_by?: string | null
          heart_rate?: number | null
          systolic_bp?: number | null
          diastolic_bp?: number | null
          temperature?: number | null
          oxygen_saturation?: number | null
          respiratory_rate?: number | null
          weight_kg?: number | null
          height_cm?: number | null
          bmi?: number | null
          blood_glucose?: number | null
          pain_level?: number | null
          notes?: string | null
          recorded_at?: string
        }
      }
      symptom_logs: {
        Row: {
          id: string
          patient_id: string
          symptom_type: string
          severity: SymptomSeverity
          duration: string | null
          body_location: string | null
          pain_level: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          symptom_type: string
          severity: SymptomSeverity
          duration?: string | null
          body_location?: string | null
          pain_level?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          symptom_type?: string
          severity?: SymptomSeverity
          duration?: string | null
          body_location?: string | null
          pain_level?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      access_grants: {
        Row: {
          id: string
          patient_id: string
          granted_to_id: string
          granted_to_role: 'doctor' | 'institution' | null
          access_level: AccessLevel
          expires_at: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          granted_to_id: string
          granted_to_role?: 'doctor' | 'institution' | null
          access_level?: AccessLevel
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          granted_to_id?: string
          granted_to_role?: 'doctor' | 'institution' | null
          access_level?: AccessLevel
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: AuditAction
          resource_type: string
          resource_id: string | null
          ip_address: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: AuditAction
          resource_type: string
          resource_id?: string | null
          ip_address?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: AuditAction
          resource_type?: string
          resource_id?: string | null
          ip_address?: string | null
          details?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_unique_code: {
        Args: {
          prefix: string
          seq_name: string
        }
        Returns: string
      }
      has_patient_access: {
        Args: {
          target_patient_id: string
        }
        Returns: boolean
      }
    }
  }
}

// Convenience Type Exports
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type PatientDetail = Database['public']['Tables']['patient_details']['Row']
export type PatientDetailInsert = Database['public']['Tables']['patient_details']['Insert']
export type PatientDetailUpdate = Database['public']['Tables']['patient_details']['Update']

export type PatientLifestyle = Database['public']['Tables']['patient_lifestyle']['Row']
export type PatientLifestyleInsert = Database['public']['Tables']['patient_lifestyle']['Insert']
export type PatientLifestyleUpdate = Database['public']['Tables']['patient_lifestyle']['Update']

export type MedicalHistory = Database['public']['Tables']['medical_history']['Row']
export type MedicalHistoryInsert = Database['public']['Tables']['medical_history']['Insert']
export type MedicalHistoryUpdate = Database['public']['Tables']['medical_history']['Update']

export type Allergy = Database['public']['Tables']['allergies']['Row']
export type AllergyInsert = Database['public']['Tables']['allergies']['Insert']
export type AllergyUpdate = Database['public']['Tables']['allergies']['Update']

export type Vaccination = Database['public']['Tables']['vaccinations']['Row']
export type VaccinationInsert = Database['public']['Tables']['vaccinations']['Insert']
export type VaccinationUpdate = Database['public']['Tables']['vaccinations']['Update']

export type DoctorDetail = Database['public']['Tables']['doctor_details']['Row']
export type DoctorDetailInsert = Database['public']['Tables']['doctor_details']['Insert']
export type DoctorDetailUpdate = Database['public']['Tables']['doctor_details']['Update']

export type DoctorSchedule = Database['public']['Tables']['doctor_schedule']['Row']
export type DoctorScheduleInsert = Database['public']['Tables']['doctor_schedule']['Insert']
export type DoctorScheduleUpdate = Database['public']['Tables']['doctor_schedule']['Update']

export type InstitutionDetail = Database['public']['Tables']['institution_details']['Row']
export type InstitutionDetailInsert = Database['public']['Tables']['institution_details']['Insert']
export type InstitutionDetailUpdate = Database['public']['Tables']['institution_details']['Update']

export type InstitutionStaff = Database['public']['Tables']['institution_staff']['Row']
export type InstitutionStaffInsert = Database['public']['Tables']['institution_staff']['Insert']
export type InstitutionStaffUpdate = Database['public']['Tables']['institution_staff']['Update']

export type Appointment = Database['public']['Tables']['appointments']['Row']
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
export type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']

export type Consultation = Database['public']['Tables']['consultations']['Row']
export type ConsultationInsert = Database['public']['Tables']['consultations']['Insert']
export type ConsultationUpdate = Database['public']['Tables']['consultations']['Update']

export type Prescription = Database['public']['Tables']['prescriptions']['Row']
export type PrescriptionInsert = Database['public']['Tables']['prescriptions']['Insert']
export type PrescriptionUpdate = Database['public']['Tables']['prescriptions']['Update']

export type LabOrder = Database['public']['Tables']['lab_orders']['Row']
export type LabOrderInsert = Database['public']['Tables']['lab_orders']['Insert']
export type LabOrderUpdate = Database['public']['Tables']['lab_orders']['Update']

export type HealthVital = Database['public']['Tables']['health_vitals']['Row']
export type HealthVitalInsert = Database['public']['Tables']['health_vitals']['Insert']
export type HealthVitalUpdate = Database['public']['Tables']['health_vitals']['Update']

export type SymptomLog = Database['public']['Tables']['symptom_logs']['Row']
export type SymptomLogInsert = Database['public']['Tables']['symptom_logs']['Insert']
export type SymptomLogUpdate = Database['public']['Tables']['symptom_logs']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type AccessGrant = Database['public']['Tables']['access_grants']['Row']
export type AccessGrantInsert = Database['public']['Tables']['access_grants']['Insert']
export type AccessGrantUpdate = Database['public']['Tables']['access_grants']['Update']

export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']
export type AuditLogUpdate = Database['public']['Tables']['audit_logs']['Update']

// ==============================================================================
// AI Response Types
// ==============================================================================

export interface AISymptomAnalysis {
  possibleConditions: Array<{
    condition: string
    probability: 'low' | 'moderate' | 'high'
    reasoning: string
    recommendedAction: string
  }>
  urgencyLevel: 'low' | 'moderate' | 'urgent' | 'emergency'
  triageAdvice: string
  suggestedQuestions: string[]
  disclaimer: string
}

export interface AIDifferentialDiagnosis {
  primaryDiagnoses: Array<{
    name: string
    icd10Code?: string
    confidence: number // 0 to 1
    justification: string
    redFlags: string[]
    recommendedTests: string[]
  }>
  secondaryConsiderations: string[]
  ruleOutConditions: string[]
  recommendedWorkup: string[]
  clinicalNotes: string
}

export interface AIDrugInteraction {
  hasInteraction: boolean
  severity: 'none' | 'minor' | 'moderate' | 'major' | 'contraindicated'
  interactingPairs: Array<{
    drugA: string
    drugB: string
    mechanism: string
    clinicalEffect: string
    managementRecommendation: string
  }>
  warnings: string[]
  dosageAdjustments?: string[]
}
