# MedConnect AI

> **A Universal Electronic Medical Record (EMR/EHR) and Telemedicine Platform with AI Clinical Assistance**

---

## 🌟 Overview

**MedConnect AI** is an enterprise-grade digital healthcare ecosystem designed to provide lifelong medical continuity, cross-institution clinical interoperability, and intelligent medical decision support.

The platform unites three core stakeholder ecosystems:
1. **Patients (`PID-XXXXXXXXX`)**: Lifelong portable health passport, personal EHR access, symptom tracking, vital metrics, consent management, and an AI Health Assistant.
2. **Doctors (`DOC-XXXXXXXXX`)**: Unified clinical workflow, patient queue triage, multi-step EMR consultations (`EMR-XXXXXXXXX`), diagnostic orders, e-prescriptions (`PRS-XXXXXXXXX`), lab orders (`LAB-XXXXXXXXX`), and AI Clinical Workspace.
3. **Institutions (`INS-XXXXXXXXX`)**: Enterprise hospital operations, affiliated practitioner credentials, department management, multi-channel clinical communication, analytics, and compliance.

---

## 🏛️ System Architecture

```
                       Web Portal / Mobile Application
                   (Patients  •  Doctors  •  Institutions)
                                     │
                                     ▼
                        Secure API Gateway (HTTPS)
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
   Authentication            Electronic Medical Records      AI Clinical Engine
   (Supabase Auth)            (Encrypted PostgreSQL)         (Risk & Note Structuring)
         │                           │                           │
         ├───────────────────────────┼───────────────────────────┤
         │                           │                           │
    Appointments                Telemedicine                Prescriptions
  (Calendar & Queue)          (Messaging & Chat)          (Pharmacy & Lab Orders)
         │                           │                           │
         └───────────────────────────┴───────────────────────────┘
                                     │
                                     ▼
                            PostgreSQL Database
                     (Row-Level Security & Audit Logs)
```

---

## 📦 Core Modules

### 1. Patient Module (`PID-XXXXXXXXX`)
- **Digital Health Passport**: Demographics, emergency contacts, blood group, genotype, biometric profile.
- **Lifelong EMR Records**: Historical visits, diagnoses, prescriptions, lab results, and discharge summaries.
- **Symptom Tracker**: Severity sliders, anatomical mapping, duration, pain assessment, and clinical notes.
- **Vital Signs Journal**: Heart rate, blood pressure, SpO2, body temperature, blood glucose, and auto-computed BMI.
- **AI Health Assistant**: Patient-facing clinical assessment, urgency triage (Routine, Urgent, Emergency), and actionable preventive recommendations.
- **Granular Consent & Access Control**: Patient-directed record sharing authorization with doctors and health facilities.

### 2. Doctor Module (`DOC-XXXXXXXXX`)
- **Clinical Registry**: Medical council license tracking, qualifications, specialties, and affiliations.
- **Patient Queue**: Live daily appointment queue with triage urgency badges and check-in workflows.
- **Consultation Flow (6-Stage EMR Builder)**:
  1. Patient selection by PID or name
  2. Chief complaint, HPI, and Review of Systems
  3. Objective physical exam & vital sign capture
  4. Diagnosis tagging & differential diagnosis
  5. Multi-item e-prescriptions & laboratory / radiology test orders
  6. Clinical follow-up instructions and permanent cryptographic `EMR-XXXXXXXXX` generation
- **AI Clinical Workspace**: 3-bullet patient rundown, risk score calculators (Cardiovascular, Sepsis, Readmission), drug-drug interaction checker, and unstructured note extraction.

### 3. Institution Module (`INS-XXXXXXXXX`)
- **Facility Credentials**: Government registration, regulatory license, accreditations, GPS coordinates, and medical director leadership.
- **Affiliated Doctor Roster**: Department assignments, credential status, and active schedules.
- **Department & Wing Management**: Capacity tracking, bed occupancy monitoring, and real-time census.
- **Institutional Analytics**: Patient throughput, department demand heatmaps, and doctor workload metrics.
- **Secure Facility Channel**: Internal urgent broadcast notifications and clinical handovers.

---

## 🔑 Unique Identification Code Hierarchy

| Entity | Code Format | Example |
|---|---|---|
| Patient | `PID-XXXXXXXXX` | `PID-000000001` |
| Doctor | `DOC-XXXXXXXXX` | `DOC-000000001` |
| Institution | `INS-XXXXXXXXX` | `INS-000000001` |
| Appointment | `APP-XXXXXXXXX` | `APP-000000001` |
| Electronic Medical Record | `EMR-XXXXXXXXX` | `EMR-000000001` |
| Prescription | `PRS-XXXXXXXXX` | `PRS-000000001` |
| Laboratory Order | `LAB-XXXXXXXXX` | `LAB-000000001` |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React Icons, Framer Motion
- **State & Data Fetching**: TanStack Query (React Query)
- **Backend & Authentication**: Supabase (PostgreSQL with Row Level Security, Auth, Storage)
- **Validation**: Zod, React Hook Form

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/damidacurator/medconnect-ai.git
cd medconnect-ai

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Run the development server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 🗄️ Database Setup

The complete PostgreSQL schema with 19 tables, sequences, RLS policies, indexes, and triggers is located in:
```
supabase/schema.sql
```
Execute the SQL script in your Supabase SQL Editor to initialize all tables, Row Level Security rules, and identification code sequences.

---

## 🔒 Security & Privacy Compliance

- **Role-Based Access Control (RBAC)** across Patients, Doctors, and Institutions.
- **Row Level Security (RLS)** ensuring patients strictly access their records and clinicians access only authorized cohorts.
- **HIPAA / GDPR / NDPA aligned data architecture** with patient consent gating and audit trail logging.
