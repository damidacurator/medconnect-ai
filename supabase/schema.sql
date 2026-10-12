-- ==============================================================================
-- MedConnect AI - Complete Supabase PostgreSQL Schema
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- CLEAN UP PREVIOUS / CONFLICTING TABLES
-- ==============================================================================
-- Ensures all 19 MedConnect AI tables are created fresh with all required columns
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.access_grants CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.symptom_logs CASCADE;
DROP TABLE IF EXISTS public.health_vitals CASCADE;
DROP TABLE IF EXISTS public.lab_orders CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.consultations CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.institution_staff CASCADE;
DROP TABLE IF EXISTS public.institution_details CASCADE;
DROP TABLE IF EXISTS public.doctor_schedule CASCADE;
DROP TABLE IF EXISTS public.doctor_details CASCADE;
DROP TABLE IF EXISTS public.vaccinations CASCADE;
DROP TABLE IF EXISTS public.allergies CASCADE;
DROP TABLE IF EXISTS public.medical_history CASCADE;
DROP TABLE IF EXISTS public.patient_lifestyle CASCADE;
DROP TABLE IF EXISTS public.patient_details CASCADE;
DROP TABLE IF EXISTS public.bmi_records CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==============================================================================
-- SEQUENCES FOR UNIQUE IDENTIFIERS
-- ==============================================================================
CREATE SEQUENCE IF NOT EXISTS patient_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS doctor_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS institution_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS appointment_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS consultation_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS prescription_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS lab_order_seq START WITH 1 INCREMENT BY 1;

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================
CREATE OR REPLACE FUNCTION generate_unique_code(prefix text, seq_name text)
RETURNS text AS $$
DECLARE
    seq_val bigint;
BEGIN
    EXECUTE format('SELECT nextval(%L)', seq_name) INTO seq_val;
    RETURN prefix || '-' || LPAD(seq_val::text, 9, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Timestamp update helper
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. PROFILES TABLE (Extends Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'institution')),
    phone TEXT,
    avatar_url TEXT,
    unique_code TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 2. PATIENT DETAILS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.patient_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT,
    marital_status TEXT,
    nationality TEXT,
    national_id TEXT,
    passport_number TEXT,
    home_address TEXT,
    occupation TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    blood_group TEXT,
    genotype TEXT,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    bmi NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. PATIENT LIFESTYLE TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.patient_lifestyle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    smoking BOOLEAN NOT NULL DEFAULT false,
    alcohol BOOLEAN NOT NULL DEFAULT false,
    exercise_frequency TEXT,
    diet_type TEXT,
    sleep_hours NUMERIC,
    drug_use BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. MEDICAL HISTORY TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.medical_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL,
    condition_name TEXT NOT NULL,
    diagnosed_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'managed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. ALLERGIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    allergy_type TEXT NOT NULL CHECK (allergy_type IN ('food', 'drug', 'environmental', 'latex', 'animal', 'other')),
    allergen TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
    reaction TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. VACCINATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vaccinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vaccine_name TEXT NOT NULL,
    dose_number INTEGER NOT NULL DEFAULT 1,
    date_administered DATE NOT NULL,
    administered_by TEXT,
    institution_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    batch_number TEXT,
    next_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. DOCTOR DETAILS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.doctor_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    medical_council_reg TEXT,
    licence_number TEXT,
    years_experience INTEGER DEFAULT 0,
    country TEXT,
    languages TEXT[] DEFAULT '{}',
    qualifications TEXT[] DEFAULT '{}',
    specialization TEXT,
    sub_specialization TEXT,
    current_institution_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    professional_memberships TEXT[] DEFAULT '{}',
    consultation_fee NUMERIC DEFAULT 0,
    is_available_virtual BOOLEAN NOT NULL DEFAULT true,
    is_available_physical BOOLEAN NOT NULL DEFAULT true,
    is_available_emergency BOOLEAN NOT NULL DEFAULT false,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. DOCTOR SCHEDULE TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.doctor_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. INSTITUTION DETAILS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.institution_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_number TEXT,
    government_licence TEXT,
    medical_licence TEXT,
    tax_number TEXT,
    hospital_category TEXT CHECK (hospital_category IN ('primary', 'secondary', 'tertiary', 'specialist', 'clinic', 'pharmacy', 'laboratory')),
    ownership TEXT CHECK (ownership IN ('government', 'private', 'ngo', 'military')),
    website TEXT,
    emergency_number TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    address TEXT,
    departments TEXT[] DEFAULT '{}',
    accreditations TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 10. INSTITUTION STAFF TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.institution_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT,
    department TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT institution_doctor_unique UNIQUE (institution_id, doctor_id)
);

-- ==============================================================================
-- 11. APPOINTMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_code TEXT UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    appointment_type TEXT NOT NULL CHECK (appointment_type IN ('virtual', 'physical', 'emergency')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 12. CONSULTATIONS TABLE (EMR Encounter Records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_code TEXT UNIQUE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    examination_findings TEXT,
    diagnosis TEXT[] DEFAULT '{}',
    differential_diagnosis TEXT[] DEFAULT '{}',
    treatment_plan TEXT,
    follow_up_date DATE,
    follow_up_notes TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 13. PRESCRIPTIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_code TEXT UNIQUE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    route TEXT NOT NULL DEFAULT 'oral' CHECK (route IN ('oral', 'iv', 'im', 'topical', 'inhaled', 'other')),
    instructions TEXT,
    quantity INTEGER,
    refills INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 14. LAB ORDERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_code TEXT UNIQUE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    test_name TEXT NOT NULL,
    test_category TEXT NOT NULL CHECK (test_category IN ('blood', 'urinalysis', 'imaging', 'pathology', 'other')),
    urgency TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'stat')),
    status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'in_progress', 'completed', 'cancelled')),
    results TEXT,
    result_date TIMESTAMPTZ,
    normal_range TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 15. HEALTH VITALS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.health_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    heart_rate INTEGER,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    temperature NUMERIC,
    oxygen_saturation NUMERIC,
    respiratory_rate INTEGER,
    weight_kg NUMERIC,
    height_cm NUMERIC,
    bmi NUMERIC,
    blood_glucose NUMERIC,
    pain_level INTEGER CHECK (pain_level BETWEEN 1 AND 10),
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 16. SYMPTOM LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.symptom_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symptom_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    duration TEXT,
    body_location TEXT,
    pain_level INTEGER CHECK (pain_level BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 17. MESSAGES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 18. ACCESS GRANTS TABLE (Consent Management)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_to_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_to_role TEXT CHECK (granted_to_role IN ('doctor', 'institution')),
    access_level TEXT NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'write', 'full')),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 19. AUDIT LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete')),
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_unique_code ON public.profiles(unique_code);

CREATE INDEX IF NOT EXISTS idx_patient_details_patient_id ON public.patient_details(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_lifestyle_patient_id ON public.patient_lifestyle(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_patient_id ON public.medical_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON public.allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_patient_id ON public.vaccinations(patient_id);

CREATE INDEX IF NOT EXISTS idx_doctor_details_doctor_id ON public.doctor_details(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_details_specialization ON public.doctor_details(specialization);
CREATE INDEX IF NOT EXISTS idx_doctor_details_curr_inst ON public.doctor_details(current_institution_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_doctor_id ON public.doctor_schedule(doctor_id);

CREATE INDEX IF NOT EXISTS idx_institution_details_inst_id ON public.institution_details(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_staff_inst_id ON public.institution_staff(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_staff_doc_id ON public.institution_staff(doctor_id);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON public.consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment_id ON public.consultations(appointment_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON public.prescriptions(consultation_id);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_id ON public.lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor_id ON public.lab_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_consultation_id ON public.lab_orders(consultation_id);

CREATE INDEX IF NOT EXISTS idx_health_vitals_patient_id ON public.health_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_vitals_recorded_at ON public.health_vitals(recorded_at);

CREATE INDEX IF NOT EXISTS idx_symptom_logs_patient_id ON public.symptom_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_patient ON public.access_grants(patient_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_granted_to ON public.access_grants(granted_to_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ==============================================================================
-- TRIGGERS FOR AUTO-GENERATING UNIQUE CODES
-- ==============================================================================

-- Appointments unique code trigger
CREATE OR REPLACE FUNCTION set_appointment_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unique_code IS NULL OR NEW.unique_code = '' THEN
        NEW.unique_code := generate_unique_code('APP', 'appointment_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_appointment_code ON public.appointments;
CREATE TRIGGER trigger_set_appointment_code
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION set_appointment_code();

-- Consultations unique code trigger
CREATE OR REPLACE FUNCTION set_consultation_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unique_code IS NULL OR NEW.unique_code = '' THEN
        NEW.unique_code := generate_unique_code('EMR', 'consultation_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_consultation_code ON public.consultations;
CREATE TRIGGER trigger_set_consultation_code
BEFORE INSERT ON public.consultations
FOR EACH ROW
EXECUTE FUNCTION set_consultation_code();

-- Prescriptions unique code trigger
CREATE OR REPLACE FUNCTION set_prescription_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unique_code IS NULL OR NEW.unique_code = '' THEN
        NEW.unique_code := generate_unique_code('PRS', 'prescription_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_prescription_code ON public.prescriptions;
CREATE TRIGGER trigger_set_prescription_code
BEFORE INSERT ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION set_prescription_code();

-- Lab Orders unique code trigger
CREATE OR REPLACE FUNCTION set_lab_order_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unique_code IS NULL OR NEW.unique_code = '' THEN
        NEW.unique_code := generate_unique_code('LAB', 'lab_order_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_lab_order_code ON public.lab_orders;
CREATE TRIGGER trigger_set_lab_order_code
BEFORE INSERT ON public.lab_orders
FOR EACH ROW
EXECUTE FUNCTION set_lab_order_code();

-- ==============================================================================
-- TRIGGER: AUTO CREATE PROFILE ON USER SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    generated_code TEXT;
    user_name TEXT;
    user_phone TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    user_phone := NEW.raw_user_meta_data->>'phone';

    -- Generate appropriate unique code based on role (fallback safely if sequence not ready)
    BEGIN
        IF user_role = 'doctor' THEN
            generated_code := generate_unique_code('DOC', 'doctor_seq');
        ELSIF user_role = 'institution' THEN
            generated_code := generate_unique_code('INS', 'institution_seq');
        ELSE
            generated_code := generate_unique_code('PID', 'patient_seq');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        generated_code := 'MC-' || UPPER(substr(md5(random()::text), 1, 8));
    END;

    -- Insert or update profile
    BEGIN
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            phone,
            avatar_url,
            unique_code,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.email,
            user_name,
            user_role,
            user_phone,
            NEW.raw_user_meta_data->>'avatar_url',
            generated_code,
            COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            phone = COALESCE(EXCLUDED.phone, profiles.phone),
            metadata = EXCLUDED.metadata,
            updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        -- Prevent blocking auth signup
    END;

    -- Auto-initialize sub-detail records
    BEGIN
        IF user_role = 'patient' THEN
            INSERT INTO public.patient_details (patient_id)
            VALUES (NEW.id)
            ON CONFLICT (patient_id) DO NOTHING;

            INSERT INTO public.patient_lifestyle (patient_id)
            VALUES (NEW.id)
            ON CONFLICT (patient_id) DO NOTHING;
        ELSIF user_role = 'doctor' THEN
            INSERT INTO public.doctor_details (doctor_id)
            VALUES (NEW.id)
            ON CONFLICT (doctor_id) DO NOTHING;
        ELSIF user_role = 'institution' THEN
            INSERT INTO public.institution_details (institution_id)
            VALUES (NEW.id)
            ON CONFLICT (institution_id) DO NOTHING;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Prevent blocking auth signup
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updating profiles updated_at
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- ==============================================================================
-- ACCESS CONTROL & PERMISSION FUNCTIONS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.has_patient_access(target_patient_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- Patient accessing own data
    IF current_user_id = target_patient_id THEN
        RETURN true;
    END IF;

    -- Check explicit active access grant
    IF EXISTS (
        SELECT 1 FROM public.access_grants
        WHERE patient_id = target_patient_id
          AND granted_to_id = current_user_id
          AND (expires_at IS NULL OR expires_at > now())
          AND revoked_at IS NULL
    ) THEN
        RETURN true;
    END IF;

    -- Check if doctor has consultation or appointment with this patient
    IF EXISTS (
        SELECT 1 FROM public.consultations
        WHERE patient_id = target_patient_id AND doctor_id = current_user_id
    ) OR EXISTS (
        SELECT 1 FROM public.appointments
        WHERE patient_id = target_patient_id AND doctor_id = current_user_id
    ) THEN
        RETURN true;
    END IF;

    -- Check institution linkage (institution staff or direct institution appointment)
    IF EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.institution_staff s ON s.institution_id = a.institution_id
        WHERE a.patient_id = target_patient_id AND (s.doctor_id = current_user_id OR a.institution_id = current_user_id)
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper to safely get caller role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_lifestyle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Doctors read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users own their profile" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Profiles insert own policy" ON public.profiles;
CREATE POLICY "Profiles insert own policy" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles update own policy" ON public.profiles;
CREATE POLICY "Profiles update own policy" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Patient Details Policies
DROP POLICY IF EXISTS "Patient details read policy" ON public.patient_details;
CREATE POLICY "Patient details read policy" ON public.patient_details
    FOR SELECT USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "Patient details update policy" ON public.patient_details;
CREATE POLICY "Patient details update policy" ON public.patient_details
    FOR UPDATE USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patient details insert policy" ON public.patient_details;
CREATE POLICY "Patient details insert policy" ON public.patient_details
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- 3. Patient Lifestyle Policies
DROP POLICY IF EXISTS "Lifestyle read policy" ON public.patient_lifestyle;
CREATE POLICY "Lifestyle read policy" ON public.patient_lifestyle
    FOR SELECT USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "Lifestyle modify policy" ON public.patient_lifestyle;
CREATE POLICY "Lifestyle modify policy" ON public.patient_lifestyle
    FOR ALL USING (auth.uid() = patient_id);

-- 4. Medical History Policies
DROP POLICY IF EXISTS "Medical history read policy" ON public.medical_history;
CREATE POLICY "Medical history read policy" ON public.medical_history
    FOR SELECT USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "Medical history insert policy" ON public.medical_history;
CREATE POLICY "Medical history insert policy" ON public.medical_history
    FOR INSERT WITH CHECK (
        auth.uid() = patient_id OR
        public.get_my_role() = 'doctor'
    );

DROP POLICY IF EXISTS "Medical history update policy" ON public.medical_history;
CREATE POLICY "Medical history update policy" ON public.medical_history
    FOR UPDATE USING (
        auth.uid() = patient_id OR
        public.get_my_role() = 'doctor'
    );

-- 5. Allergies Policies
DROP POLICY IF EXISTS "Allergies read policy" ON public.allergies;
CREATE POLICY "Allergies read policy" ON public.allergies
    FOR SELECT USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "Allergies insert policy" ON public.allergies;
CREATE POLICY "Allergies insert policy" ON public.allergies
    FOR INSERT WITH CHECK (
        auth.uid() = patient_id OR
        public.get_my_role() = 'doctor'
    );

DROP POLICY IF EXISTS "Allergies update policy" ON public.allergies;
CREATE POLICY "Allergies update policy" ON public.allergies
    FOR UPDATE USING (
        auth.uid() = patient_id OR
        public.get_my_role() = 'doctor'
    );

-- 6. Vaccinations Policies
DROP POLICY IF EXISTS "Vaccinations read policy" ON public.vaccinations;
CREATE POLICY "Vaccinations read policy" ON public.vaccinations
    FOR SELECT USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "Vaccinations write policy" ON public.vaccinations;
CREATE POLICY "Vaccinations write policy" ON public.vaccinations
    FOR ALL USING (
        auth.uid() = patient_id OR
        public.get_my_role() IN ('doctor', 'institution')
    );

-- 7. Doctor Details Policies
DROP POLICY IF EXISTS "Doctor details public read policy" ON public.doctor_details;
CREATE POLICY "Doctor details public read policy" ON public.doctor_details
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Doctor details update own policy" ON public.doctor_details;
CREATE POLICY "Doctor details update own policy" ON public.doctor_details
    FOR UPDATE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctor details insert own policy" ON public.doctor_details;
CREATE POLICY "Doctor details insert own policy" ON public.doctor_details
    FOR INSERT WITH CHECK (auth.uid() = doctor_id);

-- 8. Doctor Schedule Policies
DROP POLICY IF EXISTS "Doctor schedule read policy" ON public.doctor_schedule;
CREATE POLICY "Doctor schedule read policy" ON public.doctor_schedule
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Doctor schedule manage policy" ON public.doctor_schedule;
CREATE POLICY "Doctor schedule manage policy" ON public.doctor_schedule
    FOR ALL USING (auth.uid() = doctor_id);

-- 9. Institution Details Policies
DROP POLICY IF EXISTS "Institution details read policy" ON public.institution_details;
CREATE POLICY "Institution details read policy" ON public.institution_details
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Institution details update policy" ON public.institution_details;
CREATE POLICY "Institution details update policy" ON public.institution_details
    FOR UPDATE USING (auth.uid() = institution_id);

-- 10. Institution Staff Policies
DROP POLICY IF EXISTS "Staff read policy" ON public.institution_staff;
CREATE POLICY "Staff read policy" ON public.institution_staff
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage policy" ON public.institution_staff;
CREATE POLICY "Staff manage policy" ON public.institution_staff
    FOR ALL USING (auth.uid() = institution_id);

-- 11. Appointments Policies
DROP POLICY IF EXISTS "Appointments read policy" ON public.appointments;
CREATE POLICY "Appointments read policy" ON public.appointments
    FOR SELECT USING (
        auth.uid() = patient_id OR
        auth.uid() = doctor_id OR
        auth.uid() = institution_id
    );

DROP POLICY IF EXISTS "Appointments insert policy" ON public.appointments;
CREATE POLICY "Appointments insert policy" ON public.appointments
    FOR INSERT WITH CHECK (
        auth.uid() = patient_id OR
        auth.uid() = doctor_id OR
        auth.uid() = institution_id
    );

DROP POLICY IF EXISTS "Appointments update policy" ON public.appointments;
CREATE POLICY "Appointments update policy" ON public.appointments
    FOR UPDATE USING (
        auth.uid() = patient_id OR
        auth.uid() = doctor_id OR
        auth.uid() = institution_id
    );

-- 12. Consultations Policies
DROP POLICY IF EXISTS "Consultations read policy" ON public.consultations;
CREATE POLICY "Consultations read policy" ON public.consultations
    FOR SELECT USING (
        auth.uid() = patient_id OR
        auth.uid() = doctor_id OR
        auth.uid() = institution_id OR
        public.has_patient_access(patient_id)
    );

DROP POLICY IF EXISTS "Consultations insert policy" ON public.consultations;
CREATE POLICY "Consultations insert policy" ON public.consultations
    FOR INSERT WITH CHECK (
        auth.uid() = doctor_id
    );

DROP POLICY IF EXISTS "Consultations update policy" ON public.consultations;
CREATE POLICY "Consultations update policy" ON public.consultations
    FOR UPDATE USING (
        auth.uid() = doctor_id
    );

-- 13. Prescriptions Policies
DROP POLICY IF EXISTS "Prescriptions read policy" ON public.prescriptions;
CREATE POLICY "Prescriptions read policy" ON public.prescriptions
    FOR SELECT USING (
        auth.uid() = patient_id OR
        auth.uid() = doctor_id OR
        public.has_patient_access(patient_id)
    );

DROP POLICY IF EXISTS "Prescriptions doctor manage policy" ON public.prescriptions;
CREATE POLICY "Prescriptions doctor manage policy" ON public.prescriptions
    FOR ALL USING (
        auth.uid() = doctor_id
    );

-- 14. Lab Orders Policies
DROP POLICY IF EXISTS "Lab orders read policy" ON public.lab_orders;
CREATE POLICY "Lab orders read policy" ON public.lab_orders
    FOR SELECT USING (
        auth.uid() = patient_id OR
        auth.uid() = doctor_id OR
        auth.uid() = institution_id OR
        public.has_patient_access(patient_id)
    );

DROP POLICY IF EXISTS "Lab orders doctor insert policy" ON public.lab_orders;
CREATE POLICY "Lab orders doctor insert policy" ON public.lab_orders
    FOR INSERT WITH CHECK (
        auth.uid() = doctor_id OR
        auth.uid() = institution_id
    );

DROP POLICY IF EXISTS "Lab orders update policy" ON public.lab_orders;
CREATE POLICY "Lab orders update policy" ON public.lab_orders
    FOR UPDATE USING (
        auth.uid() = doctor_id OR
        auth.uid() = institution_id
    );

-- 15. Health Vitals Policies
DROP POLICY IF EXISTS "Health vitals read policy" ON public.health_vitals;
CREATE POLICY "Health vitals read policy" ON public.health_vitals
    FOR SELECT USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "Health vitals insert policy" ON public.health_vitals;
CREATE POLICY "Health vitals insert policy" ON public.health_vitals
    FOR INSERT WITH CHECK (
        auth.uid() = patient_id OR
        public.has_patient_access(patient_id)
    );

-- 16. Symptom Logs Policies
DROP POLICY IF EXISTS "Symptom logs read policy" ON public.symptom_logs;
CREATE POLICY "Symptom logs read policy" ON public.symptom_logs
    FOR SELECT USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "Symptom logs modify policy" ON public.symptom_logs;
CREATE POLICY "Symptom logs modify policy" ON public.symptom_logs
    FOR ALL USING (auth.uid() = patient_id);

-- 17. Messages Policies
DROP POLICY IF EXISTS "Messages select policy" ON public.messages;
CREATE POLICY "Messages select policy" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Messages insert policy" ON public.messages;
CREATE POLICY "Messages insert policy" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Messages update policy" ON public.messages;
CREATE POLICY "Messages update policy" ON public.messages
    FOR UPDATE USING (auth.uid() = receiver_id);

-- 18. Access Grants Policies
DROP POLICY IF EXISTS "Access grants view policy" ON public.access_grants;
CREATE POLICY "Access grants view policy" ON public.access_grants
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = granted_to_id);

DROP POLICY IF EXISTS "Access grants patient manage policy" ON public.access_grants;
CREATE POLICY "Access grants patient manage policy" ON public.access_grants
    FOR ALL USING (auth.uid() = patient_id);

-- 19. Audit Logs Policies
DROP POLICY IF EXISTS "Audit logs view own policy" ON public.audit_logs;
CREATE POLICY "Audit logs view own policy" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Audit logs insert policy" ON public.audit_logs;
CREATE POLICY "Audit logs insert policy" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
