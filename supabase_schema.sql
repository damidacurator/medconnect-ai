-- ============================================================
-- VITALIA COMPLETE DATABASE SETUP & EMR SYSTEM
-- Paste this entire script into:
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text,
  role        text not null check (role in ('patient', 'doctor')),
  age         integer,
  gender      text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  avatar_url  text,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- Ensure all profile columns exist even if the table was previously created with an older schema
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists metadata jsonb default '{}'::jsonb;

-- 2. SYMPTOM LOGS TABLE
create table if not exists public.symptom_logs (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  symptom_type  text not null,
  severity      text not null check (severity in ('mild', 'moderate', 'severe')),
  duration      text,
  body_location text,
  notes         text,
  created_at    timestamptz default now() not null
);

-- 3. BMI RECORDS TABLE
create table if not exists public.bmi_records (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles(id) on delete cascade,
  height_cm   numeric(6,2) not null,
  weight_kg   numeric(6,2) not null,
  bmi_value   numeric(5,2) not null,
  category    text not null check (category in ('underweight', 'normal', 'overweight', 'obese')),
  created_at  timestamptz default now() not null
);

-- 4. HEALTH VITALS TABLE
create table if not exists public.health_vitals (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references public.profiles(id) on delete cascade,
  heart_rate         integer,
  systolic_bp        integer,
  diastolic_bp       integer,
  sleep_hours        numeric(4,2),
  oxygen_saturation  integer,
  temperature        numeric(5,2),
  notes              text,
  recorded_at        timestamptz default now() not null
);

-- 5. MESSAGES TABLE (Clinical Communication & Audit Trail)
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  is_read     boolean default false not null,
  created_at  timestamptz default now() not null
);

-- 6. CONSULTATIONS TABLE (EMR Visits)
create table if not exists public.consultations (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  doctor_id       uuid not null references public.profiles(id) on delete cascade,
  chief_complaint text,
  diagnosis       text,
  treatment_plan  text,
  follow_up_date  text,
  doctor_notes    text,
  ai_summary      jsonb,
  status          text default 'completed' check (status in ('active', 'completed', 'cancelled')),
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

-- 7. PRESCRIPTIONS TABLE
create table if not exists public.prescriptions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  doctor_id       uuid not null references public.profiles(id) on delete cascade,
  consultation_id uuid references public.consultations(id) on delete cascade,
  medication_name text not null,
  dosage          text not null,
  frequency       text not null,
  duration        text not null,
  instructions    text,
  status          text default 'active' check (status in ('active', 'completed', 'discontinued')),
  created_at      timestamptz default now() not null
);

-- 8. LAB ORDERS TABLE (Lab Advice & Investigations)
create table if not exists public.lab_orders (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  doctor_id       uuid not null references public.profiles(id) on delete cascade,
  consultation_id uuid references public.consultations(id) on delete cascade,
  test_name       text not null,
  urgency         text default 'routine' check (urgency in ('routine', 'urgent', 'stat')),
  notes           text,
  results         text,
  status          text default 'ordered' check (status in ('ordered', 'pending', 'completed', 'cancelled')),
  created_at      timestamptz default now() not null
);

-- 9. APPOINTMENTS TABLE
create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  doctor_id       uuid not null references public.profiles(id) on delete cascade,
  scheduled_at    timestamptz,
  reason          text,
  notes           text,
  status          text default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.profiles (id, email, full_name, role, age, gender, metadata)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'patient'),
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'gender',
    jsonb_build_object(
      'age', (new.raw_user_meta_data->>'age')::integer,
      'gender', new.raw_user_meta_data->>'gender'
    )
  )
  on conflict (id) do update
    set
      full_name  = excluded.full_name,
      role       = excluded.role,
      age        = coalesce(excluded.age, public.profiles.age),
      gender     = coalesce(excluded.gender, public.profiles.gender),
      metadata   = coalesce(public.profiles.metadata, '{}'::jsonb) || excluded.metadata,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.symptom_logs   enable row level security;
alter table public.bmi_records    enable row level security;
alter table public.health_vitals  enable row level security;
alter table public.messages       enable row level security;
alter table public.consultations  enable row level security;
alter table public.prescriptions  enable row level security;
alter table public.lab_orders     enable row level security;
alter table public.appointments   enable row level security;

-- Profiles policies
create policy "Users own their profile"      on public.profiles for all    using (auth.uid() = id);
create policy "Doctors read all profiles"    on public.profiles for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

-- Symptom logs policies
create policy "Patients manage symptoms"     on public.symptom_logs for all    using (auth.uid() = patient_id);
create policy "Doctors manage symptoms"      on public.symptom_logs for all    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

-- BMI records policies
create policy "Patients manage bmi"          on public.bmi_records for all    using (auth.uid() = patient_id);
create policy "Doctors read bmi"             on public.bmi_records for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

-- Vitals policies
create policy "Patients manage vitals"       on public.health_vitals for all    using (auth.uid() = patient_id);
create policy "Doctors manage vitals"        on public.health_vitals for all    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

-- Messages policies
create policy "Users read their messages"     on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users send messages"          on public.messages for insert with check (auth.uid() = sender_id);
create policy "Users update read status"     on public.messages for update using (auth.uid() = receiver_id);

-- Consultations policies
create policy "Doctors manage consultations" on public.consultations for all using (auth.uid() = doctor_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));
create policy "Patients view consultations"  on public.consultations for select using (auth.uid() = patient_id);

-- Prescriptions policies
create policy "Doctors manage prescriptions" on public.prescriptions for all using (auth.uid() = doctor_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));
create policy "Patients view prescriptions"  on public.prescriptions for select using (auth.uid() = patient_id);

-- Lab orders policies
create policy "Doctors manage lab orders"    on public.lab_orders for all using (auth.uid() = doctor_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));
create policy "Patients view lab orders"     on public.lab_orders for select using (auth.uid() = patient_id);

-- Appointments policies
create policy "Users manage own appointments" on public.appointments for all using (auth.uid() = patient_id or auth.uid() = doctor_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_symptom_logs_patient   on public.symptom_logs(patient_id, created_at desc);
create index if not exists idx_bmi_records_patient     on public.bmi_records(patient_id, created_at desc);
create index if not exists idx_health_vitals_patient   on public.health_vitals(patient_id, recorded_at desc);
create index if not exists idx_profiles_role           on public.profiles(role);
create index if not exists idx_messages_sender_rec     on public.messages(sender_id, receiver_id, created_at desc);
create index if not exists idx_messages_receiver       on public.messages(receiver_id, created_at desc);
create index if not exists idx_consultations_patient   on public.consultations(patient_id, created_at desc);
create index if not exists idx_consultations_doctor    on public.consultations(doctor_id, created_at desc);
create index if not exists idx_prescriptions_patient   on public.prescriptions(patient_id, created_at desc);
create index if not exists idx_lab_orders_patient      on public.lab_orders(patient_id, created_at desc);
