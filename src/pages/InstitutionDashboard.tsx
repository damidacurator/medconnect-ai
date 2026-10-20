import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  CalendarDays,
  Building2,
  BarChart3,
  MessageSquare,
  Building,
  Settings,
  LogOut,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Send,
  Activity,
  Heart,
  Eye,
  Check,
  X,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Filter,
  RefreshCw,
  Menu,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Info,
  Save,
  ArrowRight,
  Copy,
  ExternalLink,
  ShieldAlert,
  Stethoscope,
  MapPin,
  FileText,
  UserPlus,
  Sliders,
  Download,
  Share2,
  Bell,
  Pill,
  Radio,
  Printer,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type InstitutionTab =
  | 'overview'       // Module A: Overview / Command Center
  | 'doctors'        // Module B: Doctor & Staff Management
  | 'patients'       // Module C: Patient & Client Management
  | 'appointments'   // Module D: Central Appointment Hub
  | 'broadcast'      // Module E: Communication & Outreach
  | 'pharmacy'       // Module F: Prescriptions & Pharmacy Oversight
  | 'analytics'      // Module G: Analytics & Reports
  | 'profile'        // Facility Profile
  | 'settings';      // Institutional Settings

export interface DoctorStaff {
  id: string;
  docCode: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  department: string;
  licenseNumber: string;
  status: 'on_duty' | 'off_duty' | 'on_call';
  rating: number;
  reviewsCount: number;
  shift: 'Morning (08:00 - 16:00)' | 'Evening (16:00 - 00:00)' | 'Night (00:00 - 08:00)';
  activePatients: number;
  joinedDate: string;
}

export interface PatientRecord {
  id: string;
  pid: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  phone: string;
  email: string;
  registeredDate: string;
  lastVisit: string;
  department: string;
  assignedDoctor: string;
  aiRiskLevel: 'normal' | 'moderate' | 'critical';
  aiRiskReason?: string;
  historicalVitals: Array<{
    recordedAt: string;
    systolicBp: number;
    diastolicBp: number;
    heartRate: number;
    spo2: number;
    temperature: number;
    bloodGlucose: number;
    notes?: string;
  }>;
  diagnoses: string[];
}

export interface AppointmentRecord {
  id: string;
  code: string;
  patientName: string;
  patientPid: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  type: 'In-Person' | 'Telehealth' | 'Emergency';
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Urgent';
  roomNumber?: string;
  reason?: string;
  notes?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'booking' | 'checkin' | 'prescription' | 'staff' | 'patient' | 'broadcast' | 'alert' | 'system';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'normal' | 'warning' | 'critical' | 'success';
}

export interface PrescriptionRecord {
  id: string;
  code: string;
  patientName: string;
  patientPid: string;
  doctorName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribedDate: string;
  status: 'Pending Fulfillment' | 'Dispensed';
  instructions?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stockLevel: number;
  unit: string;
  minThreshold: number;
  unitPrice: number;
  status: 'in_stock' | 'low_stock' | 'critical';
}

export interface BroadcastCampaign {
  id: string;
  audience: string;
  channels: string[];
  subject: string;
  message: string;
  sentAt: string;
  recipientsCount: number;
  status: 'Delivered' | 'Scheduled' | 'Failed';
}

export interface ChatThread {
  id: string;
  patientName: string;
  patientPid: string;
  subject: string;
  unreadCount: number;
  lastMessageTime: string;
  messages: Array<{
    id: string;
    sender: 'patient' | 'admin';
    content: string;
    timestamp: string;
  }>;
}

export interface FacilityDetails {
  name: string;
  uniqueCode: string;
  regNumber: string;
  licenseNumber: string;
  facilityType: string;
  email: string;
  phone: string;
  emergencyPhone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  medicalDirector: string;
  totalBeds: number;
  operatingHours: string;
  is24x7Emergency: boolean;
}

// Pre-approved Broadcast Templates
const BROADCAST_TEMPLATES = [
  {
    title: 'Seasonal Flu Vaccination Drive',
    subject: 'Annual Influenza Immunization Clinic Available',
    body: 'Dear {patient_name}, our annual influenza vaccination clinic is now open at {hospital_name}. Walk-ins and pre-booked appointments are welcomed between 08:00 and 17:00. Safeguard your family this season.',
  },
  {
    title: 'Pre-Consultation Fasting Advisory',
    subject: 'Important Preparation for Your Clinical Appointment',
    body: 'Dear {patient_name}, this is an automated reminder regarding your upcoming consultation on {appointment_date}. Please ensure a minimum 8-hour fasting window prior to morning metabolic and blood work.',
  },
  {
    title: 'Preventative Wellness & Hydration',
    subject: 'Hospital Health Tip: Hydration & Blood Pressure Care',
    body: 'Dear {patient_name}, regular hydration and daily blood pressure logging significantly reduce cardiovascular risks. Please remember to record your morning vitals on MedConnect AI.',
  },
  {
    title: 'Emergency Clinic Schedule Update',
    subject: 'Hospital Operational Update & Triage Advisory',
    body: 'Notice to all patients: {hospital_name} Emergency & Acute Care triage operates 24/7. Routine outpatient specialty clinics operate Mon-Sat. Contact our helpline for immediate inquiries.',
  },
];

// Initial stock ledger for pharmacy oversight
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', name: 'Amoxicillin 500mg', category: 'Antibiotic', stockLevel: 280, unit: 'capsules', minThreshold: 100, unitPrice: 12.5, status: 'in_stock' },
  { id: 'inv-2', name: 'Metformin 850mg', category: 'Antidiabetic', stockLevel: 420, unit: 'tablets', minThreshold: 150, unitPrice: 8.0, status: 'in_stock' },
  { id: 'inv-3', name: 'Lisinopril 10mg', category: 'Antihypertensive', stockLevel: 45, unit: 'tablets', minThreshold: 100, unitPrice: 14.0, status: 'low_stock' },
  { id: 'inv-4', name: 'Salbutamol Inhaler 100mcg', category: 'Respiratory', stockLevel: 18, unit: 'units', minThreshold: 50, unitPrice: 22.0, status: 'critical' },
  { id: 'inv-5', name: 'Paracetamol IV 10mg/ml', category: 'Analgesic', stockLevel: 190, unit: 'vials', minThreshold: 60, unitPrice: 18.5, status: 'in_stock' },
  { id: 'inv-6', name: 'Ceftriaxone 1g Injectable', category: 'Antibiotic', stockLevel: 32, unit: 'vials', minThreshold: 80, unitPrice: 35.0, status: 'low_stock' },
];

export function InstitutionDashboard() {
  const { user, profile, loading, isDemo, signOut } = useAuth();

  // Active module navigation
  const [activeTab, setActiveTab] = useState<InstitutionTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Session guard
  useEffect(() => {
    if (loading) return;
    const demo = localStorage.getItem('medconnect_demo_user');
    if (!user && !profile && !demo && !isDemo) {
      window.location.href = '/';
    }
  }, [user, profile, loading, isDemo]);

  // Facility Metadata
  const [facility, setFacility] = useState<FacilityDetails>(() => {
    const meta = (profile?.metadata as any) || {};
    return {
      name: meta.institutionName || profile?.full_name || 'Healthcare Facility',
      uniqueCode: profile?.unique_code || (user ? `INS-${user.id.replace(/-/g, '').slice(0, 9).toUpperCase()}` : 'INS-000001'),
      regNumber: meta.regNumber || '',
      licenseNumber: meta.licenseNumber || 'Verified License',
      facilityType: meta.category || 'General Hospital & Medical Center',
      email: user?.email || '',
      phone: profile?.phone || '',
      emergencyPhone: meta.emergencyPhone || '+1 (800) 999-CARE',
      website: meta.website || '',
      address: meta.address || '',
      city: meta.city || '',
      state: meta.state || '',
      medicalDirector: profile?.full_name || 'Medical Director',
      totalBeds: Number(meta.totalBeds) || 60,
      operatingHours: '24/7 Acute & Emergency Services',
      is24x7Emergency: true,
    };
  });

  // Keep live clock updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync profile metadata if updated
  useEffect(() => {
    if (profile) {
      const meta = (profile.metadata as any) || {};
      setFacility(prev => ({
        ...prev,
        name: meta.institutionName || profile.full_name || prev.name,
        uniqueCode: profile.unique_code || prev.uniqueCode,
        regNumber: meta.regNumber || prev.regNumber,
        phone: profile.phone || prev.phone,
        email: user?.email || prev.email,
      }));
    }
  }, [profile, user]);

  // Core State Lists (Backed by localStorage + Supabase queries)
  const [doctors, setDoctors] = useState<DoctorStaff[]>(() => {
    const saved = localStorage.getItem('medconnect_inst_doctors');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  const [patients, setPatients] = useState<PatientRecord[]>(() => {
    const saved = localStorage.getItem('medconnect_inst_patients');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  const [appointments, setAppointments] = useState<AppointmentRecord[]>(() => {
    const saved = localStorage.getItem('medconnect_inst_appointments');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>(() => {
    const saved = localStorage.getItem('medconnect_inst_prescriptions');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>(() => {
    const saved = localStorage.getItem('medconnect_inst_activity');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('medconnect_inst_inventory');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_INVENTORY;
  });

  const [broadcasts, setBroadcasts] = useState<BroadcastCampaign[]>(() => {
    const saved = localStorage.getItem('medconnect_inst_broadcasts');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  const [chatThreads, setChatThreads] = useState<ChatThread[]>(() => {
    const saved = localStorage.getItem('medconnect_inst_chats');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  // Save changes to localStorage for resilience
  useEffect(() => {
    localStorage.setItem('medconnect_inst_doctors', JSON.stringify(doctors));
  }, [doctors]);

  useEffect(() => {
    localStorage.setItem('medconnect_inst_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('medconnect_inst_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('medconnect_inst_prescriptions', JSON.stringify(prescriptions));
  }, [prescriptions]);

  useEffect(() => {
    localStorage.setItem('medconnect_inst_activity', JSON.stringify(activityFeed));
  }, [activityFeed]);

  useEffect(() => {
    localStorage.setItem('medconnect_inst_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('medconnect_inst_broadcasts', JSON.stringify(broadcasts));
  }, [broadcasts]);

  useEffect(() => {
    localStorage.setItem('medconnect_inst_chats', JSON.stringify(chatThreads));
  }, [chatThreads]);

  // Load real data from Supabase on mount
  useEffect(() => {
    async function fetchDatabaseData() {
      if (!user) return;
      try {
        // Fetch appointments linked to this institution
        const { data: dbAppointments } = await supabase
          .from('appointments')
          .select('*')
          .order('scheduled_at', { ascending: false })
          .limit(50);

        if (dbAppointments && dbAppointments.length > 0) {
          const mapped: AppointmentRecord[] = dbAppointments.map((a: any) => ({
            id: a.id,
            code: a.unique_code || `APT-${a.id.slice(0, 6).toUpperCase()}`,
            patientName: a.patient_id ? `Patient (${a.patient_id.slice(0, 6)})` : 'Walk-In Patient',
            patientPid: a.patient_id?.slice(0, 8) || 'N/A',
            doctorId: a.doctor_id,
            doctorName: 'Attending Physician',
            department: 'General Outpatient',
            date: a.scheduled_at ? a.scheduled_at.split('T')[0] : new Date().toISOString().split('T')[0],
            time: a.scheduled_at ? new Date(a.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00',
            type: a.appointment_type === 'virtual' ? 'Telehealth' : a.appointment_type === 'emergency' ? 'Emergency' : 'In-Person',
            status: a.status === 'confirmed' ? 'Confirmed' : a.status === 'completed' ? 'Completed' : a.status === 'cancelled' ? 'Cancelled' : 'Pending',
            reason: a.reason || 'Routine Consultation',
          }));

          setAppointments(prev => (prev.length === 0 ? mapped : prev));
        }

        // Fetch real doctors from profiles with role doctor
        const { data: dbDoctors } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'doctor')
          .limit(20);

        if (dbDoctors && dbDoctors.length > 0) {
          const mappedDocs: DoctorStaff[] = dbDoctors.map((d: any, index: number) => ({
            id: d.id,
            docCode: d.unique_code || `DOC-${d.id.slice(0, 6).toUpperCase()}`,
            name: d.full_name || 'Medical Officer',
            email: d.email,
            phone: d.phone || 'Contact pending',
            specialization: (d.metadata as any)?.specialization || 'General Practice',
            department: (d.metadata as any)?.department || 'Internal Medicine',
            licenseNumber: (d.metadata as any)?.councilReg || `MD-LIC-${1000 + index}`,
            status: index % 2 === 0 ? 'on_duty' : 'off_duty',
            rating: 4.8,
            reviewsCount: 14,
            shift: index % 3 === 0 ? 'Morning (08:00 - 16:00)' : index % 3 === 1 ? 'Evening (16:00 - 00:00)' : 'Night (00:00 - 08:00)',
            activePatients: index + 1,
            joinedDate: d.created_at ? d.created_at.split('T')[0] : '2026-01-15',
          }));
          setDoctors(prev => (prev.length === 0 ? mappedDocs : prev));
        }

        // Fetch real prescriptions from database
        const { data: dbPrescriptions } = await supabase
          .from('prescriptions')
          .select('*')
          .limit(30);

        if (dbPrescriptions && dbPrescriptions.length > 0) {
          const mappedRx: PrescriptionRecord[] = dbPrescriptions.map((p: any) => ({
            id: p.id,
            code: p.unique_code || `RX-${p.id.slice(0, 6).toUpperCase()}`,
            patientName: `Patient #${p.patient_id?.slice(0, 6)}`,
            patientPid: p.patient_id?.slice(0, 8) || 'N/A',
            doctorName: 'Clinical Officer',
            medicationName: p.medication_name,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            prescribedDate: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            status: p.status === 'completed' ? 'Dispensed' : 'Pending Fulfillment',
            instructions: p.instructions || '',
          }));
          setPrescriptions(prev => (prev.length === 0 ? mappedRx : prev));
        }

        // Check health vitals for AI risk alerts
        const { data: dbVitals } = await supabase
          .from('health_vitals')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(40);

        if (dbVitals && dbVitals.length > 0) {
          // Identify any critical vitals
          const criticalVitals = dbVitals.filter((v: any) =>
            (v.systolic_bp && v.systolic_bp >= 140) ||
            (v.diastolic_bp && v.diastolic_bp >= 90) ||
            (v.oxygen_saturation && v.oxygen_saturation < 95) ||
            (v.blood_glucose && (v.blood_glucose < 70 || v.blood_glucose > 180))
          );

          if (criticalVitals.length > 0) {
            // Log real alert in activity feed if not already present
            setActivityFeed(prev => {
              if (prev.some(a => a.type === 'alert')) return prev;
              const alertEvents: ActivityEvent[] = criticalVitals.slice(0, 2).map((v: any) => ({
                id: `alert-${v.id}`,
                type: 'alert',
                title: 'Critical Vital Flag Triggered',
                description: `Patient #${v.patient_id.slice(0, 6)} logged BP ${v.systolic_bp}/${v.diastolic_bp} mmHg. Requires triage review.`,
                timestamp: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                severity: 'critical',
              }));
              return [...alertEvents, ...prev];
            });
          }
        }
      } catch (err) {
        console.warn('Note on institution initial sync:', err);
      }
    }

    fetchDatabaseData();
  }, [user]);

  // Log activity helper
  const logActivity = (type: ActivityEvent['type'], title: string, description: string, severity: ActivityEvent['severity'] = 'normal') => {
    const newEvent: ActivityEvent = {
      id: crypto.randomUUID(),
      type,
      title,
      description,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity,
    };
    setActivityFeed(prev => [newEvent, ...prev.slice(0, 49)]);
  };

  // Copy unique code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(facility.uniqueCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalPatients = patients.length;
    const activeDoctorsOnDuty = doctors.filter(d => d.status === 'on_duty').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const appointmentsToday = appointments.filter(a => a.date === todayStr || a.date === 'Today').length;
    const urgentAiAlerts = patients.filter(p => p.aiRiskLevel === 'critical').length +
      activityFeed.filter(a => a.type === 'alert' && a.severity === 'critical').length;

    return {
      totalPatients,
      activeDoctorsOnDuty,
      totalDoctors: doctors.length,
      appointmentsToday,
      urgentAiAlerts,
    };
  }, [patients, doctors, appointments, activityFeed]);

  // Modal states
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [selectedPatientForRecord, setSelectedPatientForRecord] = useState<PatientRecord | null>(null);
  const [reassignModalAppointment, setReassignModalAppointment] = useState<AppointmentRecord | null>(null);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);

  // Navigation Items
  interface NavItemEntry {
    id: InstitutionTab;
    label: string;
    icon: any;
    badge?: string | number;
    badgeColor?: string;
  }

  interface NavItemGroup {
    group: string;
    items: NavItemEntry[];
  }

  const navItems: NavItemGroup[] = [
    {
      group: 'OPERATIONS',
      items: [
        { id: 'overview', label: 'Command Center', icon: LayoutDashboard, badge: metrics.urgentAiAlerts > 0 ? `${metrics.urgentAiAlerts} Alert` : undefined, badgeColor: 'bg-rose-500/20 text-rose-300' },
        { id: 'appointments', label: 'Central Appointment Hub', icon: Calendar, badge: appointments.length > 0 ? appointments.length : undefined },
      ],
    },
    {
      group: 'CLINICAL & CLIENTS',
      items: [
        { id: 'doctors', label: 'Doctor & Staff Management', icon: Stethoscope, badge: doctors.length > 0 ? `${metrics.activeDoctorsOnDuty}/${doctors.length}` : undefined },
        { id: 'patients', label: 'Patient & Client Management', icon: Users, badge: patients.length > 0 ? patients.length : undefined },
      ],
    },
    {
      group: 'COMMUNICATIONS & PHARMACY',
      items: [
        { id: 'broadcast', label: 'Communication & Outreach', icon: Radio, badge: broadcasts.length > 0 ? broadcasts.length : undefined },
        { id: 'pharmacy', label: 'Prescriptions & Pharmacy', icon: Pill, badge: prescriptions.filter(p => p.status === 'Pending Fulfillment').length > 0 ? `${prescriptions.filter(p => p.status === 'Pending Fulfillment').length} pending` : undefined, badgeColor: 'bg-amber-500/20 text-amber-300' },
      ],
    },
    {
      group: 'INTELLIGENCE & SETTINGS',
      items: [
        { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
        { id: 'profile', label: 'Facility Profile', icon: Building2 },
        { id: 'settings', label: 'Hospital Settings', icon: Settings },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 animate-pulse mb-4">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Building2 className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-400">Loading Enterprise Hospital Operations Center...</p>
      </div>
    );
  }

  // Cross-role guard
  if (profile && profile.role !== 'institution' && !isDemo) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-200 px-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 rounded-3xl p-8 text-center space-y-4 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Role Mismatch</h2>
          <p className="text-sm text-slate-400">
            This account is registered as a <span className="text-indigo-400 font-semibold uppercase">{profile.role}</span>. The Institution Command Center is restricted to verified healthcare institution administrators only.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (profile.role === 'patient') window.location.href = '/patient';
                else if (profile.role === 'doctor') window.location.href = '/doctor';
              }}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-indigo-500 text-white hover:bg-indigo-400 transition"
            >
              Go to {profile.role === 'doctor' ? 'Doctor' : 'Patient'} Portal
            </button>
            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/';
              }}
              className="py-2.5 px-4 rounded-xl font-bold text-sm bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* ==================================================================== */}
      {/* MOBILE APP HEADER                                                    */}
      {/* ==================================================================== */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-teal-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight line-clamp-1">{facility.name}</h1>
            <span className="text-[11px] font-mono text-teal-400">{facility.uniqueCode}</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* ==================================================================== */}
      {/* ENTERPRISE DESKTOP SIDEBAR NAVIGATION                                */}
      {/* ==================================================================== */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-slate-900/95 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Hospital Branding & Verified ID Pill */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-teal-500/25">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-tight truncate">MedConnect AI</span>
                <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  OS
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate font-medium">{facility.name}</p>
            </div>
          </div>

          {/* Verified Institution Badge & Copy Tool */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Institution ID</p>
                <p className="text-xs font-mono font-bold text-teal-300 truncate">{facility.uniqueCode}</p>
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              title="Copy Code"
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Semantic Navigation Rail */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 custom-scrollbar">
          {navItems.map((group) => (
            <div key={group.group}>
              <h2 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                {group.group}
              </h2>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group text-left',
                        isActive
                          ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/10 text-teal-300 border border-teal-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 truncate">
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                            isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0',
                            item.badgeColor || (isActive ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400')
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Operating Status & Admin Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Clinical System Online
            </span>
            <span className="font-mono text-slate-500">v2.4.0</span>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
              {facility.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Hospital Admin'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/';
              }}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* MAIN CONTENT AREA - RESPONSIVE DESKTOP GRID                          */}
      {/* ==================================================================== */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Top Command Bar */}
        <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Enterprise</span>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold text-slate-300">
              {activeTab === 'overview' && 'Command Center'}
              {activeTab === 'doctors' && 'Doctor & Staff Management'}
              {activeTab === 'patients' && 'Patient & Client Registry'}
              {activeTab === 'appointments' && 'Central Appointment Hub'}
              {activeTab === 'broadcast' && 'Communication & Outreach'}
              {activeTab === 'pharmacy' && 'Prescriptions & Pharmacy Oversight'}
              {activeTab === 'analytics' && 'Analytics & Compliance'}
              {activeTab === 'profile' && 'Facility Accreditation & Profile'}
              {activeTab === 'settings' && 'Institutional Settings'}
            </span>
          </div>

          {/* Quick Actions & Live Time */}
          <div className="flex items-center gap-3">
            {/* Live UTC/Local Clock */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{currentTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            {/* Quick Action: Onboard Staff */}
            <button
              onClick={() => setIsOnboardingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors shadow-sm shadow-teal-500/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Onboard Doctor</span>
            </button>

            {/* Quick Action: Broadcast */}
            <button
              onClick={() => setActiveTab('broadcast')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Broadcast</span>
            </button>

            {/* Quick Action: Sign Out */}
            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/';
              }}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Active Module Container */}
        <div className="p-6 md:p-8 space-y-8 flex-1">
          {/* MODULE A: OVERVIEW / COMMAND CENTER */}
          {activeTab === 'overview' && (
            <ModuleOverview
              facility={facility}
              metrics={metrics}
              activityFeed={activityFeed}
              doctors={doctors}
              patients={patients}
              appointments={appointments}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenOnboardModal={() => setIsOnboardingModalOpen(true)}
              onOpenNewAppointment={() => setIsNewAppointmentModalOpen(true)}
              onViewPatientRecord={(p) => setSelectedPatientForRecord(p)}
            />
          )}

          {/* MODULE B: DOCTOR & STAFF MANAGEMENT */}
          {activeTab === 'doctors' && (
            <ModuleDoctorsStaff
              doctors={doctors}
              onAddDoctor={(newDoc) => {
                setDoctors(prev => [newDoc, ...prev]);
                logActivity('staff', 'New Medical Officer Onboarded', `Dr. ${newDoc.name} assigned to ${newDoc.department}.`, 'success');
              }}
              onToggleStatus={(docId, newStatus) => {
                setDoctors(prev =>
                  prev.map(d => (d.id === docId ? { ...d, status: newStatus } : d))
                );
                logActivity('staff', 'Doctor Duty Status Changed', `Medical officer status updated to ${newStatus}.`, 'normal');
              }}
              onOpenModal={() => setIsOnboardingModalOpen(true)}
            />
          )}

          {/* MODULE C: PATIENT & CLIENT MANAGEMENT */}
          {activeTab === 'patients' && (
            <ModulePatientsClients
              patients={patients}
              doctors={doctors}
              onViewRecord={(patient) => setSelectedPatientForRecord(patient)}
              onAddPatient={(newPatient) => {
                setPatients(prev => [newPatient, ...prev]);
                logActivity('patient', 'Patient Enrolled', `${newPatient.name} (PID: ${newPatient.pid}) added to directory.`, 'success');
              }}
              onScheduleAppointment={(patient) => {
                setActiveTab('appointments');
              }}
            />
          )}

          {/* MODULE D: CENTRAL APPOINTMENT HUB */}
          {activeTab === 'appointments' && (
            <ModuleAppointmentHub
              appointments={appointments}
              doctors={doctors}
              patients={patients}
              onOpenNewModal={() => setIsNewAppointmentModalOpen(true)}
              onReassignAppointment={(app) => setReassignModalAppointment(app)}
              onUpdateStatus={(appId, newStatus) => {
                setAppointments(prev =>
                  prev.map(a => (a.id === appId ? { ...a, status: newStatus } : a))
                );
                logActivity('booking', 'Appointment Status Updated', `Appointment marked as ${newStatus}.`, 'normal');
              }}
            />
          )}

          {/* MODULE E: COMMUNICATION & OUTREACH */}
          {activeTab === 'broadcast' && (
            <ModuleCommunicationOutreach
              facility={facility}
              broadcasts={broadcasts}
              chatThreads={chatThreads}
              patientsCount={patients.length}
              onSendBroadcast={(campaign) => {
                setBroadcasts(prev => [campaign, ...prev]);
                logActivity('broadcast', 'Institutional Broadcast Dispatched', `Broadcast "${campaign.subject}" sent to ${campaign.recipientsCount} recipients.`, 'success');
              }}
              onSendMessage={(threadId, text) => {
                setChatThreads(prev =>
                  prev.map(th => {
                    if (th.id === threadId) {
                      return {
                        ...th,
                        unreadCount: 0,
                        lastMessageTime: 'Just now',
                        messages: [
                          ...th.messages,
                          {
                            id: crypto.randomUUID(),
                            sender: 'admin',
                            content: text,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          },
                        ],
                      };
                    }
                    return th;
                  })
                );
              }}
            />
          )}

          {/* MODULE F: PRESCRIPTIONS & PHARMACY OVERSIGHT */}
          {activeTab === 'pharmacy' && (
            <ModulePharmacyOversight
              prescriptions={prescriptions}
              inventory={inventory}
              onDispensePrescription={(rxId) => {
                setPrescriptions(prev =>
                  prev.map(p => (p.id === rxId ? { ...p, status: 'Dispensed' } : p))
                );
                logActivity('prescription', 'Prescription Dispensed', `Prescription ${rxId} marked as dispensed by pharmacy ledger.`, 'success');
              }}
              onRestockItem={(itemId, amount) => {
                setInventory(prev =>
                  prev.map(item => {
                    if (item.id === itemId) {
                      const newStock = item.stockLevel + amount;
                      const status = newStock > item.minThreshold ? 'in_stock' : newStock > item.minThreshold / 2 ? 'low_stock' : 'critical';
                      return { ...item, stockLevel: newStock, status };
                    }
                    return item;
                  })
                );
                logActivity('system', 'Pharmacy Inventory Restocked', `Restocked inventory item ${itemId} (+${amount}).`, 'normal');
              }}
            />
          )}

          {/* MODULE G: ANALYTICS & REPORTS */}
          {activeTab === 'analytics' && (
            <ModuleAnalyticsReports
              facility={facility}
              patients={patients}
              doctors={doctors}
              appointments={appointments}
              prescriptions={prescriptions}
              activityFeed={activityFeed}
            />
          )}

          {/* MODULE: FACILITY PROFILE */}
          {activeTab === 'profile' && (
            <ModuleFacilityProfile
              facility={facility}
              onSaveFacility={(updated) => {
                setFacility(updated);
                logActivity('system', 'Facility Information Updated', 'Institutional accreditation and facility details were updated.', 'normal');
              }}
            />
          )}

          {/* MODULE: SETTINGS */}
          {activeTab === 'settings' && (
            <ModuleHospitalSettings
              facility={facility}
              signOut={signOut}
            />
          )}
        </div>
      </main>

      {/* ==================================================================== */}
      {/* GLOBAL MODALS                                                        */}
      {/* ==================================================================== */}

      {/* 1. Onboarding Doctor Modal */}
      {isOnboardingModalOpen && (
        <OnboardDoctorModal
          isOpen={isOnboardingModalOpen}
          onClose={() => setIsOnboardingModalOpen(false)}
          onAddDoctor={(newDoc) => {
            setDoctors(prev => [newDoc, ...prev]);
            logActivity('staff', 'New Doctor Onboarded', `Dr. ${newDoc.name} registered to ${newDoc.department}.`, 'success');
            setIsOnboardingModalOpen(false);
          }}
        />
      )}

      {/* 2. Medical Record Detailed Modal */}
      {selectedPatientForRecord && (
        <MedicalRecordModal
          patient={selectedPatientForRecord}
          onClose={() => setSelectedPatientForRecord(null)}
          onAlertDoctor={(patientId) => {
            logActivity('alert', 'Clinical Alert Dispatched to Attending Doctor', `Emergency review request for patient ${patientId}.`, 'critical');
            alert('Clinical alert dispatched to attending on-duty physician.');
          }}
        />
      )}

      {/* 3. Reassign Appointment Modal */}
      {reassignModalAppointment && (
        <ReassignAppointmentModal
          appointment={reassignModalAppointment}
          doctors={doctors}
          onClose={() => setReassignModalAppointment(null)}
          onReassign={(appId, newDoctorId, newDoctorName, reason) => {
            setAppointments(prev =>
              prev.map(a =>
                a.id === appId
                  ? { ...a, doctorId: newDoctorId, doctorName: newDoctorName, notes: `Reassigned: ${reason}` }
                  : a
              )
            );
            logActivity('booking', 'Appointment Reassigned', `Reassigned appointment ${appId} to Dr. ${newDoctorName}. Reason: ${reason}`, 'warning');
            setReassignModalAppointment(null);
          }}
        />
      )}

      {/* 4. Schedule New Appointment Modal */}
      {isNewAppointmentModalOpen && (
        <ScheduleAppointmentModal
          doctors={doctors}
          patients={patients}
          onClose={() => setIsNewAppointmentModalOpen(false)}
          onBook={(newApp) => {
            setAppointments(prev => [newApp, ...prev]);
            logActivity('booking', 'New Appointment Scheduled', `${newApp.type} appointment booked for ${newApp.patientName} with Dr. ${newApp.doctorName}.`, 'success');
            setIsNewAppointmentModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT MODULE A: OVERVIEW / COMMAND CENTER
// ============================================================================

interface ModuleOverviewProps {
  facility: FacilityDetails;
  metrics: {
    totalPatients: number;
    activeDoctorsOnDuty: number;
    totalDoctors: number;
    appointmentsToday: number;
    urgentAiAlerts: number;
  };
  activityFeed: ActivityEvent[];
  doctors: DoctorStaff[];
  patients: PatientRecord[];
  appointments: AppointmentRecord[];
  onNavigate: (tab: InstitutionTab) => void;
  onOpenOnboardModal: () => void;
  onOpenNewAppointment: () => void;
  onViewPatientRecord: (p: PatientRecord) => void;
}

function ModuleOverview({
  facility,
  metrics,
  activityFeed,
  doctors,
  patients,
  appointments,
  onNavigate,
  onOpenOnboardModal,
  onOpenNewAppointment,
  onViewPatientRecord,
}: ModuleOverviewProps) {
  const [activityFilter, setActivityFilter] = useState<'all' | 'booking' | 'staff' | 'alert' | 'pharmacy'>('all');

  const filteredFeed = activityFeed.filter(ev => {
    if (activityFilter === 'all') return true;
    return ev.type === activityFilter;
  });

  const criticalPatients = patients.filter(p => p.aiRiskLevel === 'critical');

  return (
    <div className="space-y-6">
      {/* Operational Greeting & Facility Status */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Mission Critical Command System
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {facility.name} — Administrative Command Center
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time facility oversight, on-duty clinical rosters, central appointment management, and automated AI health risk monitoring.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('broadcast')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-2"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Broadcast Message
          </button>
          <button
            onClick={onOpenOnboardModal}
            className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-2 shadow-sm shadow-teal-500/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Onboard New Doctor
          </button>
          <button
            onClick={() => onNavigate('analytics')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-2"
          >
            <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Core 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Patients Enrolled */}
        <div
          onClick={() => onNavigate('patients')}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Patients Enrolled</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{metrics.totalPatients}</span>
            <span className="text-xs text-slate-500">records</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span className="text-teal-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Linked to Facility
            </span>
            <span className="text-slate-500 group-hover:text-slate-300">View Registry &rarr;</span>
          </div>
        </div>

        {/* Card 2: Active Doctors On-Duty */}
        <div
          onClick={() => onNavigate('doctors')}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Active Doctors On-Duty</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{metrics.activeDoctorsOnDuty}</span>
            <span className="text-xs text-slate-500 font-mono">/ {metrics.totalDoctors} registered</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span className="text-cyan-400 font-medium">
              {metrics.totalDoctors > 0 ? `${Math.round((metrics.activeDoctorsOnDuty / metrics.totalDoctors) * 100)}% active shift` : '0 shifts assigned'}
            </span>
            <span className="text-slate-500 group-hover:text-slate-300">Roster &rarr;</span>
          </div>
        </div>

        {/* Card 3: Appointments Today */}
        <div
          onClick={() => onNavigate('appointments')}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Appointments Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{metrics.appointmentsToday}</span>
            <span className="text-xs text-slate-500">scheduled</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> Outpatient / In-Person
            </span>
            <span className="text-slate-500 group-hover:text-slate-300">Schedule &rarr;</span>
          </div>
        </div>

        {/* Card 4: Urgent AI Alerts */}
        <div
          onClick={() => onNavigate('patients')}
          className={cn(
            'p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm',
            metrics.urgentAiAlerts > 0
              ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          )}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Urgent AI Alerts</span>
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110',
                metrics.urgentAiAlerts > 0 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-400'
              )}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-3xl font-extrabold tracking-tight',
                metrics.urgentAiAlerts > 0 ? 'text-rose-400' : 'text-slate-300'
              )}
            >
              {metrics.urgentAiAlerts}
            </span>
            <span className="text-xs text-slate-500">critical flags</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-800/80 pt-2.5">
            <span className={metrics.urgentAiAlerts > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
              {metrics.urgentAiAlerts > 0 ? 'Critical vitals detected' : 'All vitals within range'}
            </span>
            <span className="text-slate-500 group-hover:text-slate-300">Triage &rarr;</span>
          </div>
        </div>
      </div>

      {/* Two-Column Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  Live Operational Activity Feed
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time institutional log of bookings, patient check-ins, prescriptions, and system diagnostics.
                </p>
              </div>

              {/* Feed Filter Chips */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {(['all', 'booking', 'staff', 'alert', 'pharmacy'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActivityFilter(tab)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-medium capitalize transition-colors',
                      activityFilter === tab
                        ? 'bg-teal-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Event List or Blank State */}
            {filteredFeed.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl">
                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No events logged in this category</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Hospital events such as doctor check-ins, patient appointments, and broadcasts will stream here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredFeed.map(event => (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5',
                        event.type === 'alert'
                          ? 'bg-rose-500/20 text-rose-400'
                          : event.type === 'booking'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : event.type === 'prescription'
                          ? 'bg-amber-500/20 text-amber-400'
                          : event.type === 'broadcast'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-teal-500/20 text-teal-400'
                      )}
                    >
                      {event.type === 'alert' && <AlertTriangle className="w-4 h-4" />}
                      {event.type === 'booking' && <Calendar className="w-4 h-4" />}
                      {event.type === 'prescription' && <Pill className="w-4 h-4" />}
                      {event.type === 'broadcast' && <Radio className="w-4 h-4" />}
                      {event.type === 'staff' && <Stethoscope className="w-4 h-4" />}
                      {event.type === 'system' && <ShieldCheck className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white truncate">{event.title}</p>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{event.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Operational Snapshot */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Departmental Operational Capacity
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Emergency Acute', status: 'Optimal Flow', load: '32%', color: 'text-emerald-400' },
                { name: 'Cardiology', status: 'Full Roster', load: '68%', color: 'text-teal-400' },
                { name: 'Internal Medicine', status: 'Moderate Load', load: '54%', color: 'text-cyan-400' },
                { name: 'Pediatrics', status: 'On-Call Ready', load: '41%', color: 'text-blue-400' },
              ].map(dep => (
                <div key={dep.name} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-xs font-bold text-white truncate">{dep.name}</p>
                  <p className={cn('text-[11px] font-medium mt-1', dep.color)}>{dep.status}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Capacity</span>
                    <span>{dep.load}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): AI Health Risk Flags & On-Duty Staff */}
        <div className="space-y-6">
          {/* AI Health Risk Watchlist */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                AI Health Risk Watchlist
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                {criticalPatients.length} High Risk
              </span>
            </div>

            {criticalPatients.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl">
                <ShieldCheck className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">No Critical Risk Alerts</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Patient vitals are continuously scanned by MedConnect AI. Abnormal values will be escalated here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {criticalPatients.slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        PID: {p.pid}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {p.aiRiskReason || 'Critical blood pressure / SpO2 anomaly detected.'}
                    </p>
                    <button
                      onClick={() => onViewPatientRecord(p)}
                      className="w-full mt-1 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold border border-rose-500/40 transition-colors"
                    >
                      Open Clinical Record & Triage
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* On-Duty Doctors Snapshot */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-400" />
                On-Duty Doctors ({metrics.activeDoctorsOnDuty})
              </h3>
              <button
                onClick={() => onNavigate('doctors')}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium"
              >
                Manage All
              </button>
            </div>

            {doctors.filter(d => d.status === 'on_duty').length === 0 ? (
              <div className="py-6 text-center border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No doctors currently set to On-Duty.</p>
                <button
                  onClick={onOpenOnboardModal}
                  className="mt-2 text-xs font-bold text-teal-400 hover:underline"
                >
                  + Onboard or toggle duty
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {doctors
                  .filter(d => d.status === 'on_duty')
                  .slice(0, 4)
                  .map(doc => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {doc.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{doc.specialization} &bull; {doc.department}</p>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="On-Duty" />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT MODULE B: DOCTOR & STAFF MANAGEMENT
// ============================================================================

interface ModuleDoctorsStaffProps {
  doctors: DoctorStaff[];
  onAddDoctor: (doc: DoctorStaff) => void;
  onToggleStatus: (docId: string, status: DoctorStaff['status']) => void;
  onOpenModal: () => void;
}

function ModuleDoctorsStaff({
  doctors,
  onAddDoctor,
  onToggleStatus,
  onOpenModal,
}: ModuleDoctorsStaffProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'directory' | 'schedule'>('directory');

  const departments = ['All', 'Internal Medicine', 'Cardiology', 'Emergency', 'Pediatrics', 'General Surgery', 'Orthopedics'];

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || doc.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header with Search and Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-400" />
            Clinical Personnel & Staff Roster
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage physician availability, verify professional license credentials, and assign shift schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('directory')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-colors',
                viewMode === 'directory' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              Directory Table
            </button>
            <button
              onClick={() => setViewMode('schedule')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-colors',
                viewMode === 'schedule' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              Shift Schedule Manager
            </button>
          </div>

          <button
            onClick={onOpenModal}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-2 shadow-sm shadow-teal-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Onboard New Doctor
          </button>
        </div>
      </div>

      {viewMode === 'directory' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by physician name, license, or specialty..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs text-slate-500 font-medium">Department:</span>
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                    deptFilter === dept
                      ? 'bg-slate-800 text-teal-300 border border-teal-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-950/40 border border-transparent'
                  )}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Doctors Table */}
          {filteredDoctors.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
              <Stethoscope className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Clinical Staff Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm || deptFilter !== 'All'
                  ? 'No doctors match your active search filters.'
                  : 'Your clinical roster is currently empty. Onboard your medical personnel using the button above.'}
              </p>
              <button
                onClick={onOpenModal}
                className="mt-4 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors"
              >
                + Onboard Medical Staff
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Physician / License</th>
                      <th className="py-3.5 px-4">Specialization & Dept</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Duty Status</th>
                      <th className="py-3.5 px-4">Rating / Reviews</th>
                      <th className="py-3.5 px-4">Shift Assignment</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredDoctors.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/10 text-teal-300 font-bold flex items-center justify-center border border-teal-500/30">
                              {doc.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white">{doc.name}</p>
                              <span className="font-mono text-[10px] text-slate-500">{doc.licenseNumber}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-200">{doc.specialization}</p>
                          <span className="text-[11px] text-slate-400">{doc.department}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-slate-300">{doc.email}</p>
                          <span className="text-[11px] text-slate-500">{doc.phone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={doc.status}
                            onChange={e => onToggleStatus(doc.id, e.target.value as any)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer',
                              doc.status === 'on_duty'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : doc.status === 'on_call'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            )}
                          >
                            <option value="on_duty">On-Duty</option>
                            <option value="off_duty">Off-Duty</option>
                            <option value="on_call">On-Call</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-400">&#9733; {doc.rating.toFixed(1)}</span>
                            <span className="text-[11px] text-slate-500">({doc.reviewsCount})</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono">
                            {doc.shift}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => alert(`Doctor ${doc.name} profile and active load: ${doc.activePatients} patients assigned.`)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            Workload
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Schedule Manager Calendar View */
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              Doctor Availability & Shift Rosters
            </h3>
            <span className="text-xs text-slate-400 font-mono">Weekly Shift Distribution</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { shift: 'Morning Shift (08:00 - 16:00)', tag: 'Morning (08:00 - 16:00)', color: 'border-teal-500/30 bg-teal-500/5' },
              { shift: 'Evening Shift (16:00 - 00:00)', tag: 'Evening (16:00 - 00:00)', color: 'border-cyan-500/30 bg-cyan-500/5' },
              { shift: 'Night Shift (00:00 - 08:00)', tag: 'Night (00:00 - 08:00)', color: 'border-blue-500/30 bg-blue-500/5' },
            ].map(col => {
              const assigned = doctors.filter(d => d.shift === col.tag);
              return (
                <div key={col.shift} className={cn('p-4 rounded-xl border space-y-3', col.color)}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white">{col.shift}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {assigned.length} Doctors
                    </span>
                  </div>

                  {assigned.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No physicians assigned to this shift slot.</p>
                  ) : (
                    <div className="space-y-2">
                      {assigned.map(d => (
                        <div key={d.id} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white">{d.name}</p>
                            <p className="text-[10px] text-slate-400">{d.department}</p>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded font-bold uppercase',
                              d.status === 'on_duty' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                            )}
                          >
                            {d.status === 'on_duty' ? 'Active' : 'Off'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT MODULE C: PATIENT & CLIENT MANAGEMENT
// ============================================================================

interface ModulePatientsClientsProps {
  patients: PatientRecord[];
  doctors: DoctorStaff[];
  onViewRecord: (p: PatientRecord) => void;
  onAddPatient: (p: PatientRecord) => void;
  onScheduleAppointment: (p: PatientRecord) => void;
}

function ModulePatientsClients({
  patients,
  doctors,
  onViewRecord,
  onAddPatient,
  onScheduleAppointment,
}: ModulePatientsClientsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'moderate' | 'normal'>('all');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  // New patient state
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState<number>(35);
  const [newPatientGender, setNewPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [newPatientBlood, setNewPatientBlood] = useState('O+');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientDept, setNewPatientDept] = useState('General Outpatient');

  const filteredPatients = patients.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'all' || p.aiRiskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;

    const newRecord: PatientRecord = {
      id: crypto.randomUUID(),
      pid: `PID-${Math.floor(100000 + Math.random() * 900000)}`,
      name: newPatientName,
      age: Number(newPatientAge) || 30,
      gender: newPatientGender,
      bloodGroup: newPatientBlood,
      phone: newPatientPhone || 'N/A',
      email: newPatientEmail || 'N/A',
      registeredDate: new Date().toISOString().split('T')[0],
      lastVisit: 'Today',
      department: newPatientDept,
      assignedDoctor: doctors[0]?.name || 'Unassigned',
      aiRiskLevel: 'normal',
      historicalVitals: [
        {
          recordedAt: new Date().toISOString().split('T')[0],
          systolicBp: 120,
          diastolicBp: 80,
          heartRate: 72,
          spo2: 98,
          temperature: 36.8,
          bloodGlucose: 95,
          notes: 'Baseline intake vitals recorded.',
        },
      ],
      diagnoses: ['General Health Assessment'],
    };

    onAddPatient(newRecord);
    setNewPatientName('');
    setNewPatientPhone('');
    setNewPatientEmail('');
    setIsAddPatientOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            Institutional Patient Directory & Clinical Records
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralized institutional access to patient dossiers, historical vitals logs, and automated AI health risk flags.
          </p>
        </div>

        <button
          onClick={() => setIsAddPatientOpen(true)}
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-2 shadow-sm shadow-teal-500/20"
        >
          <UserPlus className="w-4 h-4" />
          Enroll New Patient
        </button>
      </div>

      {/* Filter and Risk Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by patient name, PID, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(['all', 'critical', 'moderate', 'normal'] as const).map(rf => (
            <button
              key={rf}
              onClick={() => setRiskFilter(rf)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium capitalize transition-colors',
                riskFilter === rf
                  ? rf === 'critical'
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-teal-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {rf === 'critical' ? 'AI Critical Flags' : rf}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Table */}
      {filteredPatients.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Patient Records Linked</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || riskFilter !== 'all'
              ? 'No patients match your search criteria.'
              : 'Your hospital patient directory is a clean slate. Enroll your first patient to access comprehensive medical records and AI alerts.'}
          </p>
          <button
            onClick={() => setIsAddPatientOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors"
          >
            + Enroll Patient Record
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Patient Name & PID</th>
                  <th className="py-3.5 px-4">Demographics</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Department / Doctor</th>
                  <th className="py-3.5 px-4">AI Health Risk Flag</th>
                  <th className="py-3.5 px-4">Last Visit</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-white">{p.name}</p>
                        <span className="font-mono text-[10px] text-teal-400">{p.pid}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-200">{p.age} yrs &bull; {p.gender}</p>
                      <span className="text-[10px] font-mono text-slate-400">Blood: {p.bloodGroup}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-300">{p.phone}</p>
                      <span className="text-[11px] text-slate-500">{p.email}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">{p.department}</p>
                      <span className="text-[11px] text-slate-400">{p.assignedDoctor}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5',
                          p.aiRiskLevel === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : p.aiRiskLevel === 'moderate'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            p.aiRiskLevel === 'critical' ? 'bg-rose-400' : p.aiRiskLevel === 'moderate' ? 'bg-amber-400' : 'bg-emerald-400'
                          )}
                        />
                        {p.aiRiskLevel === 'critical' ? 'Critical Alert' : p.aiRiskLevel === 'moderate' ? 'Moderate Risk' : 'Normal'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{p.lastVisit}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewRecord(p)}
                          className="px-3 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-semibold transition-colors"
                        >
                          Medical Record
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enroll Patient Modal */}
      {isAddPatientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-400" />
                Enroll Patient in Institutional Registry
              </h3>
              <button
                onClick={() => setIsAddPatientOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newPatientName}
                  onChange={e => setNewPatientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Age</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={newPatientAge}
                    onChange={e => setNewPatientAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={e => setNewPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Blood Group</label>
                  <select
                    value={newPatientBlood}
                    onChange={e => setNewPatientBlood(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newPatientPhone}
                    onChange={e => setNewPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="patient@email.com"
                    value={newPatientEmail}
                    onChange={e => setNewPatientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Admitting Department</label>
                <select
                  value={newPatientDept}
                  onChange={e => setNewPatientDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="General Outpatient">General Outpatient</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Emergency & Acute Care">Emergency & Acute Care</option>
                  <option value="Pediatrics">Pediatrics</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPatientOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT MODULE D: CENTRAL APPOINTMENT HUB
// ============================================================================

interface ModuleAppointmentHubProps {
  appointments: AppointmentRecord[];
  doctors: DoctorStaff[];
  patients: PatientRecord[];
  onOpenNewModal: () => void;
  onReassignAppointment: (app: AppointmentRecord) => void;
  onUpdateStatus: (appId: string, status: AppointmentRecord['status']) => void;
}

function ModuleAppointmentHub({
  appointments,
  doctors,
  patients,
  onOpenNewModal,
  onReassignAppointment,
  onUpdateStatus,
}: ModuleAppointmentHubProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAppointments = appointments.filter(a => {
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesSearch =
      a.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header with Switcher and New Booking */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-400" />
            Central Appointment Scheduling Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Oversee institutional clinical scheduling, resolve doctor booking conflicts, and manage real-time patient wait queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-colors',
                viewMode === 'list' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              List Ledger
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-colors',
                viewMode === 'calendar' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              Calendar Matrix
            </button>
          </div>

          <button
            onClick={onOpenNewModal}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-2 shadow-sm shadow-teal-500/20"
          >
            <Plus className="w-4 h-4" />
            Schedule Appointment
          </button>
        </div>
      </div>

      {/* Status Filters and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search appointment code, patient, or physician..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Urgent'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-colors',
                statusFilter === st
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'list' ? (
        filteredAppointments.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Appointments Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'All'
                ? 'No appointments match your filters.'
                : 'No appointments are currently queued in the institutional hub.'}
            </p>
            <button
              onClick={onOpenNewModal}
              className="mt-4 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors"
            >
              + Schedule First Appointment
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Appt Code</th>
                    <th className="py-3.5 px-4">Patient Name</th>
                    <th className="py-3.5 px-4">Assigned Doctor</th>
                    <th className="py-3.5 px-4">Department & Type</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Reassignment / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredAppointments.map(app => (
                    <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{app.code}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{app.patientName}</p>
                        <span className="text-[10px] text-slate-500 font-mono">PID: {app.patientPid}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-200">{app.doctorName}</p>
                        {app.notes && <span className="text-[10px] text-amber-400 block truncate max-w-[160px]">{app.notes}</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-slate-200">{app.department}</p>
                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                          {app.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <p className="text-white">{app.date}</p>
                        <span className="text-slate-400">{app.time}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={app.status}
                          onChange={e => onUpdateStatus(app.id, e.target.value as any)}
                          className={cn(
                            'px-2 py-0.5 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer',
                            app.status === 'Confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : app.status === 'Urgent'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : app.status === 'Completed'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : app.status === 'Cancelled'
                              ? 'bg-slate-800 text-slate-500 border-slate-700'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          )}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onReassignAppointment(app)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-semibold text-xs transition-colors"
                        >
                          Reassign Doctor
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Calendar Matrix Grid */
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Institutional Daily Matrix</span>
            <span className="text-xs text-slate-400 font-mono">Total Slots: {filteredAppointments.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['08:00 - 10:00', '10:00 - 12:00', '13:00 - 15:00', '15:00 - 17:00'].map(slot => {
              const inSlot = filteredAppointments.filter((_, idx) => idx % 4 === ['08:00 - 10:00', '10:00 - 12:00', '13:00 - 15:00', '15:00 - 17:00'].indexOf(slot));
              return (
                <div key={slot} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-400 font-mono">{slot}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{inSlot.length} booked</span>
                  </div>

                  {inSlot.length === 0 ? (
                    <p className="text-xs text-slate-600 py-3 text-center">Open availability slot.</p>
                  ) : (
                    <div className="space-y-2">
                      {inSlot.map(app => (
                        <div key={app.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                          <p className="text-xs font-bold text-white">{app.patientName}</p>
                          <p className="text-[10px] text-teal-400">Dr. {app.doctorName}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{app.department}</span>
                            <span className="text-emerald-400 font-mono">{app.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT MODULE E: COMMUNICATION & OUTREACH
// ============================================================================

interface ModuleCommunicationOutreachProps {
  facility: FacilityDetails;
  broadcasts: BroadcastCampaign[];
  chatThreads: ChatThread[];
  patientsCount: number;
  onSendBroadcast: (campaign: BroadcastCampaign) => void;
  onSendMessage: (threadId: string, text: string) => void;
}

function ModuleCommunicationOutreach({
  facility,
  broadcasts,
  chatThreads,
  patientsCount,
  onSendBroadcast,
  onSendMessage,
}: ModuleCommunicationOutreachProps) {
  const [activeSubTab, setActiveSubTab] = useState<'broadcast' | 'inbox'>('broadcast');

  // Broadcast Creator Form State
  const [selectedAudience, setSelectedAudience] = useState('All Enrolled Patients');
  const [channels, setChannels] = useState<{ sms: boolean; email: boolean; inApp: boolean }>({
    sms: true,
    email: true,
    inApp: true,
  });
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(chatThreads[0]?.id || null);
  const [replyText, setReplyText] = useState('');

  const handleApplyTemplate = (tmpl: typeof BROADCAST_TEMPLATES[0]) => {
    setSubject(tmpl.subject);
    const resolvedBody = tmpl.body
      .replace(/{hospital_name}/g, facility.name)
      .replace(/{patient_name}/g, '[Patient Name]')
      .replace(/{appointment_date}/g, '[Scheduled Date]');
    setMessageBody(resolvedBody);
  };

  const handleDispatchBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !messageBody.trim()) {
      alert('Please provide both subject and campaign message.');
      return;
    }

    const selectedChannelsList: string[] = [];
    if (channels.sms) selectedChannelsList.push('SMS');
    if (channels.email) selectedChannelsList.push('Email');
    if (channels.inApp) selectedChannelsList.push('In-App');

    const newCampaign: BroadcastCampaign = {
      id: crypto.randomUUID(),
      audience: selectedAudience,
      channels: selectedChannelsList,
      subject,
      message: messageBody,
      sentAt: new Date().toLocaleString(),
      recipientsCount: patientsCount > 0 ? patientsCount : 48,
      status: 'Delivered',
    };

    onSendBroadcast(newCampaign);
    setSubject('');
    setMessageBody('');
    alert(`Broadcast campaign "${newCampaign.subject}" successfully scheduled and dispatched!`);
  };

  const activeThread = chatThreads.find(th => th.id === activeThreadId);

  const handleSendChatReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThreadId) return;
    onSendMessage(activeThreadId, replyText);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-400" />
            Communication & Patient Outreach
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deliver multi-channel broadcasts for immunization drives and reminders, and resolve two-way inquiries from registered clients.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('broadcast')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-2',
              activeSubTab === 'broadcast' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            )}
          >
            <Radio className="w-3.5 h-3.5" />
            Campaign Broadcast Creator
          </button>
          <button
            onClick={() => setActiveSubTab('inbox')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-2',
              activeSubTab === 'inbox' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Two-Way Messaging Inbox
          </button>
        </div>
      </div>

      {activeSubTab === 'broadcast' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Broadcast Composer */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" />
              Compose Targeted Institutional Outreach
            </h3>

            <form onSubmit={handleDispatchBroadcast} className="space-y-4">
              {/* Target Audience Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  1. Target Patient Cohort
                </label>
                <select
                  value={selectedAudience}
                  onChange={e => setSelectedAudience(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="All Enrolled Patients">All Enrolled Patients ({patientsCount} records)</option>
                  <option value="Cardiology Department Patients">Cardiology Department Cohort</option>
                  <option value="Pediatrics & Guardians">Pediatrics & Guardians</option>
                  <option value="Chronic Hypertension Monitoring">Chronic Hypertension Monitoring Cohort</option>
                  <option value="Diabetic Care Registry">Diabetic Care Registry</option>
                </select>
              </div>

              {/* Delivery Channels */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  2. Select Delivery Channels
                </label>
                <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.sms}
                      onChange={e => setChannels(c => ({ ...c, sms: e.target.checked }))}
                      className="rounded accent-teal-500"
                    />
                    <span>SMS Broadcast</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.email}
                      onChange={e => setChannels(c => ({ ...c, email: e.target.checked }))}
                      className="rounded accent-teal-500"
                    />
                    <span>Email Advisory</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.inApp}
                      onChange={e => setChannels(c => ({ ...c, inApp: e.target.checked }))}
                      className="rounded accent-teal-500"
                    />
                    <span>In-App Mobile Push Notification</span>
                  </label>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  3. Announcement Subject Line
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Influenza Vaccination Drive Available at Facility"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  4. Broadcast Body Content
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Write clear, professional patient announcement..."
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500 font-sans"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Dynamic placeholders: <code className="text-teal-400 font-mono">{"{patient_name}"}</code>, <code className="text-teal-400 font-mono">{"{hospital_name}"}</code>
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-teal-500/20 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Dispatch Broadcast to Cohort
              </button>
            </form>
          </div>

          {/* Right 1 Col: Pre-Approved Template Library & History */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Pre-Approved Template Library
              </h3>
              <p className="text-xs text-slate-400">
                Click any standard clinical announcement template to auto-populate the composer.
              </p>

              <div className="space-y-2 mt-3">
                {BROADCAST_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="w-full p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 text-left transition-colors group"
                  >
                    <p className="text-xs font-bold text-white group-hover:text-teal-300">{tmpl.title}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{tmpl.subject}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Broadcast History */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white">Recent Dispatched Campaigns</h3>
              {broadcasts.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No campaigns sent yet.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {broadcasts.map(b => (
                    <div key={b.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <p className="text-xs font-bold text-white truncate">{b.subject}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{b.audience}</span>
                        <span className="text-emerald-400">{b.recipientsCount} delivered</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Two-Way Messaging Inbox */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[580px] rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          {/* Thread List */}
          <div className="border-r border-slate-800 bg-slate-950/50 flex flex-col h-full">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Patient Inquiries</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {chatThreads.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No active patient inquiries.</p>
              ) : (
                chatThreads.map(th => (
                  <button
                    key={th.id}
                    onClick={() => setActiveThreadId(th.id)}
                    className={cn(
                      'w-full p-3 rounded-xl text-left transition-colors',
                      activeThreadId === th.id
                        ? 'bg-teal-500/20 border border-teal-500/40 text-teal-300'
                        : 'bg-slate-900/40 border border-transparent hover:bg-slate-800/60 text-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{th.patientName}</span>
                      <span className="text-[10px] font-mono text-slate-500">{th.lastMessageTime}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-1">{th.subject}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Active Chat Pane */}
          <div className="md:col-span-2 flex flex-col h-full bg-slate-950">
            {activeThread ? (
              <>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                  <div>
                    <h4 className="text-sm font-bold text-white">{activeThread.patientName}</h4>
                    <p className="text-[11px] text-slate-400">Inquiry: {activeThread.subject}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    PID: {activeThread.patientPid}
                  </span>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                  {activeThread.messages.map(m => (
                    <div
                      key={m.id}
                      className={cn(
                        'max-w-[75%] p-3 rounded-2xl text-xs',
                        m.sender === 'admin'
                          ? 'ml-auto bg-teal-500 text-slate-950 rounded-br-none font-medium'
                          : 'bg-slate-800 text-slate-200 rounded-bl-none'
                      )}
                    >
                      <p>{m.content}</p>
                      <span
                        className={cn(
                          'text-[9px] block text-right mt-1 font-mono',
                          m.sender === 'admin' ? 'text-slate-800' : 'text-slate-400'
                        )}
                      >
                        {m.timestamp}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChatReply} className="p-3 border-t border-slate-800 flex items-center gap-2 bg-slate-900/60">
                  <input
                    type="text"
                    placeholder="Type official response to patient..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors"
                  >
                    Reply
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                Select a message thread on the left to review communication logs.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT MODULE F: PRESCRIPTIONS & PHARMACY OVERSIGHT
// ============================================================================

interface ModulePharmacyOversightProps {
  prescriptions: PrescriptionRecord[];
  inventory: InventoryItem[];
  onDispensePrescription: (rxId: string) => void;
  onRestockItem: (itemId: string, amount: number) => void;
}

function ModulePharmacyOversight({
  prescriptions,
  inventory,
  onDispensePrescription,
  onRestockItem,
}: ModulePharmacyOversightProps) {
  const [subTab, setSubTab] = useState<'prescriptions' | 'inventory'>('prescriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [restockItemId, setRestockItemId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState<number>(50);

  const filteredRx = prescriptions.filter(p =>
    p.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-400" />
            Prescriptions & Pharmacy Oversight
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor institutional medication orders, track dispensing fulfillment queues, and audit in-house stock reserves.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setSubTab('prescriptions')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg font-semibold transition-colors',
              subTab === 'prescriptions' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            )}
          >
            Prescription Ledger
          </button>
          <button
            onClick={() => setSubTab('inventory')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg font-semibold transition-colors',
              subTab === 'inventory' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            )}
          >
            In-House Pharmacy Inventory
          </button>
        </div>
      </div>

      {subTab === 'prescriptions' ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search medication, Rx code, or patient..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Issued: {prescriptions.length}
            </span>
          </div>

          {filteredRx.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
              <Pill className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Prescriptions in Ledger</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Prescriptions written by on-duty physicians will automatically populate this ledger for dispensing confirmation.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Rx Code</th>
                      <th className="py-3.5 px-4">Patient Name</th>
                      <th className="py-3.5 px-4">Prescribing Doctor</th>
                      <th className="py-3.5 px-4">Medication & Dosage</th>
                      <th className="py-3.5 px-4">Frequency & Duration</th>
                      <th className="py-3.5 px-4">Prescribed Date</th>
                      <th className="py-3.5 px-4">Fulfillment Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredRx.map(rx => (
                      <tr key={rx.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{rx.code}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{rx.patientName}</td>
                        <td className="py-3.5 px-4 text-slate-300">{rx.doctorName}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-100">{rx.medicationName}</p>
                          <span className="text-[10px] text-teal-400 font-mono">{rx.dosage}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-slate-300">{rx.frequency}</p>
                          <span className="text-[10px] text-slate-500 font-mono">{rx.duration}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{rx.prescribedDate}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                              rx.status === 'Dispensed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            )}
                          >
                            {rx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {rx.status !== 'Dispensed' ? (
                            <button
                              onClick={() => onDispensePrescription(rx.id)}
                              className="px-2.5 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors"
                            >
                              Mark Dispensed
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-medium flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* In-House Pharmacy Inventory */
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Medication Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Stock On Hand</th>
                    <th className="py-3.5 px-4">Safety Minimum</th>
                    <th className="py-3.5 px-4">Unit Price</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Inventory Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {inventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{item.name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{item.category}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                        {item.stockLevel} {item.unit}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {item.minThreshold} {item.unit}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                            item.status === 'in_stock'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : item.status === 'low_stock'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300 animate-pulse'
                          )}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setRestockItemId(item.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold transition-colors"
                        >
                          Restock Batch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Restock Dialog */}
          {restockItemId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <div className="w-full max-w-sm p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white">Batch Restock Order</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Quantity to add</label>
                  <input
                    type="number"
                    min={10}
                    value={restockQty}
                    onChange={e => setRestockQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setRestockItemId(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onRestockItem(restockItemId, restockQty);
                      setRestockItemId(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-teal-500 text-xs font-bold text-slate-950"
                  >
                    Confirm Restock
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT MODULE G: ANALYTICS & REPORTS
// ============================================================================

interface ModuleAnalyticsReportsProps {
  facility: FacilityDetails;
  patients: PatientRecord[];
  doctors: DoctorStaff[];
  appointments: AppointmentRecord[];
  prescriptions: PrescriptionRecord[];
  activityFeed: ActivityEvent[];
}

function ModuleAnalyticsReports({
  facility,
  patients,
  doctors,
  appointments,
  prescriptions,
  activityFeed,
}: ModuleAnalyticsReportsProps) {
  // Export helper for CSV
  const handleExportCSV = (filename: string, rows: string[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPatients = () => {
    const headers = ['PID', 'Name', 'Age', 'Gender', 'BloodGroup', 'Phone', 'Email', 'RiskLevel'];
    const data = patients.map(p => [p.pid, `"${p.name}"`, String(p.age), p.gender, p.bloodGroup, p.phone, p.email, p.aiRiskLevel]);
    handleExportCSV('medconnect_patients_registry', [headers, ...data]);
  };

  const exportAppointments = () => {
    const headers = ['ApptCode', 'PatientName', 'DoctorName', 'Department', 'Date', 'Time', 'Type', 'Status'];
    const data = appointments.map(a => [a.code, `"${a.patientName}"`, `"${a.doctorName}"`, a.department, a.date, a.time, a.type, a.status]);
    handleExportCSV('medconnect_appointments_log', [headers, ...data]);
  };

  const exportPrescriptions = () => {
    const headers = ['RxCode', 'PatientName', 'DoctorName', 'Medication', 'Dosage', 'Frequency', 'Date', 'Status'];
    const data = prescriptions.map(p => [p.code, `"${p.patientName}"`, `"${p.doctorName}"`, `"${p.medicationName}"`, p.dosage, p.frequency, p.prescribedDate, p.status]);
    handleExportCSV('medconnect_prescriptions_ledger', [headers, ...data]);
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Tools */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            Administrative Analytics & Compliance Reporting
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational intelligence, clinician utilization statistics, and institutional CSV data export tools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
          <button
            onClick={exportPatients}
            className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export Patients (CSV)
          </button>
          <button
            onClick={exportAppointments}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export Appointments (CSV)
          </button>
        </div>
      </div>

      {/* Analytics KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Bed Utilization Rate', value: '62.5%', detail: 'Occupied vs Total Licensed', color: 'text-teal-400' },
          { label: 'Avg Patient Wait Time', value: '14 mins', detail: 'Triage to Consultation', color: 'text-cyan-400' },
          { label: 'Consultation Completion', value: '94.8%', detail: 'Scheduled vs Delivered', color: 'text-emerald-400' },
          { label: 'Active Clinical Hours', value: '24/7', detail: 'Emergency Tier Verified', color: 'text-blue-400' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
            <p className={cn('text-2xl font-black mt-1', kpi.color)}>{kpi.value}</p>
            <span className="text-[10px] text-slate-500 mt-1 block">{kpi.detail}</span>
          </div>
        ))}
      </div>

      {/* Charts & Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Patient Inflow Trends */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              Patient Inflow & Daily Admissions (Past 7 Days)
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Weekly Total</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2 border-b border-slate-800">
            {[
              { day: 'Mon', count: 18, height: '45%' },
              { day: 'Tue', count: 24, height: '60%' },
              { day: 'Wed', count: 32, height: '80%' },
              { day: 'Thu', count: 28, height: '70%' },
              { day: 'Fri', count: 38, height: '95%' },
              { day: 'Sat', count: 22, height: '55%' },
              { day: 'Sun', count: 15, height: '35%' },
            ].map(col => (
              <div key={col.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-mono text-teal-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  {col.count}
                </span>
                <div
                  style={{ height: col.height }}
                  className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-teal-500/40 to-teal-400 group-hover:from-teal-400 group-hover:to-cyan-300 transition-all"
                />
                <span className="text-[10px] font-mono text-slate-400">{col.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Peak Booking Hours */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Peak Outpatient Consultation Hours (08:00 - 18:00)
            </h3>
            <span className="text-[11px] font-mono text-cyan-400 font-bold">Peak: 10:00 - 12:00</span>
          </div>

          <div className="space-y-2.5 pt-2">
            {[
              { slot: '08:00 - 10:00 (Early Morning)', pct: 55, count: '14 consultations' },
              { slot: '10:00 - 12:00 (Peak Morning Flow)', pct: 88, count: '28 consultations' },
              { slot: '12:00 - 14:00 (Midday Care)', pct: 40, count: '11 consultations' },
              { slot: '14:00 - 16:00 (Afternoon Clinic)', pct: 72, count: '21 consultations' },
              { slot: '16:00 - 18:00 (Evening Triage)', pct: 48, count: '13 consultations' },
            ].map(item => (
              <div key={item.slot} className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>{item.slot}</span>
                  <span className="font-mono text-slate-400">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    style={{ width: `${item.pct}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Common Diagnoses Distribution */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white">Diagnostic & Triage Breakdown</h3>
          <div className="space-y-3">
            {[
              { diag: 'Hypertension & Cardiovascular', pct: 34, color: 'bg-rose-400' },
              { diag: 'Type 2 Diabetes & Metabolic', pct: 26, color: 'bg-teal-400' },
              { diag: 'Respiratory / Acute Asthma', pct: 18, color: 'bg-cyan-400' },
              { diag: 'General Infectious / Viral', pct: 14, color: 'bg-blue-400' },
              { diag: 'Orthopedic / Musculoskeletal', pct: 8, color: 'bg-amber-400' },
            ].map(d => (
              <div key={d.diag} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{d.diag}</span>
                  <span className="font-mono font-bold text-white">{d.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div style={{ width: `${d.pct}%` }} className={cn('h-full rounded-full', d.color)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Export Hub */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Regulatory Data Download Suite</h3>
            <p className="text-xs text-slate-400 mt-1">
              Download complete, timestamped institutional data files formatted for compliance auditing and external health authority submission.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={exportPatients}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-left font-semibold text-slate-200 flex items-center justify-between transition-colors"
            >
              <span>Patient Cohort Master Registry</span>
              <span className="text-teal-400 font-mono text-[11px]">&darr; CSV</span>
            </button>
            <button
              onClick={exportAppointments}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-left font-semibold text-slate-200 flex items-center justify-between transition-colors"
            >
              <span>Appointments & Schedule Audit</span>
              <span className="text-cyan-400 font-mono text-[11px]">&darr; CSV</span>
            </button>
            <button
              onClick={exportPrescriptions}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-left font-semibold text-slate-200 flex items-center justify-between transition-colors"
            >
              <span>Prescription & Pharmacy Dispensing Ledger</span>
              <span className="text-amber-400 font-mono text-[11px]">&darr; CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT MODULE: FACILITY PROFILE
// ============================================================================

interface ModuleFacilityProfileProps {
  facility: FacilityDetails;
  onSaveFacility: (updated: FacilityDetails) => void;
}

function ModuleFacilityProfile({ facility, onSaveFacility }: ModuleFacilityProfileProps) {
  const [formData, setFormData] = useState<FacilityDetails>(facility);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveFacility(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            Healthcare Facility Profile & Licensing
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Maintain institutional credentials, regulatory license numbers, and emergency point-of-contact details.
          </p>
        </div>
        {isSaved && (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Profile Updated
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Institution Legal Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Unique Institution ID (System Key)</label>
            <input
              type="text"
              readOnly
              value={formData.uniqueCode}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-teal-400 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">State Reg Number</label>
            <input
              type="text"
              placeholder="e.g. REG-88421-H"
              value={formData.regNumber}
              onChange={e => setFormData({ ...formData, regNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Medical Operating License</label>
            <input
              type="text"
              placeholder="e.g. LIC-MED-994"
              value={formData.licenseNumber}
              onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Facility Category</label>
            <input
              type="text"
              value={formData.facilityType}
              onChange={e => setFormData({ ...formData, facilityType: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Official Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Primary Reception Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">24/7 Emergency Hotline</label>
            <input
              type="text"
              value={formData.emergencyPhone}
              onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Chief Medical Director</label>
            <input
              type="text"
              value={formData.medicalDirector}
              onChange={e => setFormData({ ...formData, medicalDirector: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Total Licensed Inpatient Beds</label>
            <input
              type="number"
              value={formData.totalBeds}
              onChange={e => setFormData({ ...formData, totalBeds: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors shadow-sm shadow-teal-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Institutional Credentials
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT MODULE: HOSPITAL SETTINGS
// ============================================================================

interface ModuleHospitalSettingsProps {
  facility: FacilityDetails;
  signOut: () => Promise<void>;
}

function ModuleHospitalSettings({ facility, signOut }: ModuleHospitalSettingsProps) {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-400" />
          Institutional System Preferences & Security
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure clinical security policies, automated data synchronizations, and session parameters.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white">Clinical Compliance & Audit Logging</h3>
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Automated AI Health Risk Alerts</p>
              <p className="text-[11px] text-slate-400">Escalate critical vitals immediately to on-duty physicians.</p>
            </div>
            <span className="text-xs font-bold text-emerald-400">Enabled</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Row Level Security (RLS) Cryptographic Encryption</p>
              <p className="text-[11px] text-slate-400">Restricts patient records strictly to verified clinical staff.</p>
            </div>
            <span className="text-xs font-bold text-emerald-400">Enforced</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-rose-400">Sign Out of Hospital Enterprise Console</p>
            <p className="text-[11px] text-slate-500">Terminates administrative session on this workstation.</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = '/';
            }}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: ONBOARD NEW DOCTOR
// ============================================================================

interface OnboardDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDoctor: (doc: DoctorStaff) => void;
}

function OnboardDoctorModal({ isOpen, onClose, onAddDoctor }: OnboardDoctorModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('Internal Medicine');
  const [department, setDepartment] = useState('Internal Medicine');
  const [shift, setShift] = useState<DoctorStaff['shift']>('Morning (08:00 - 16:00)');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !licenseNumber.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const newDoctor: DoctorStaff = {
      id: crypto.randomUUID(),
      docCode: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
      email,
      phone: phone || '+1 (555) 000-0000',
      specialization,
      department,
      licenseNumber,
      status: 'on_duty',
      rating: 5.0,
      reviewsCount: 1,
      shift,
      activePatients: 0,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    onAddDoctor(newDoctor);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-400" />
            Onboard New Medical Practitioner
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name (including title)</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Alexander Vance"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Official Email</label>
              <input
                type="email"
                required
                placeholder="physician@hospital.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Medical License Number</label>
              <input
                type="text"
                required
                placeholder="e.g. MD-LIC-9842"
                value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Specialization</label>
              <input
                type="text"
                required
                placeholder="e.g. Cardiology"
                value={specialization}
                onChange={e => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Clinical Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Emergency & Acute Care">Emergency & Acute Care</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="General Surgery">General Surgery</option>
                <option value="Orthopedics">Orthopedics</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Initial Shift Roster</label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Morning (08:00 - 16:00)">Morning (08:00 - 16:00)</option>
                <option value="Evening (16:00 - 00:00)">Evening (16:00 - 00:00)</option>
                <option value="Night (00:00 - 08:00)">Night (00:00 - 08:00)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors"
            >
              Complete Onboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: MEDICAL RECORD ACCESS MODAL
// ============================================================================

interface MedicalRecordModalProps {
  patient: PatientRecord;
  onClose: () => void;
  onAlertDoctor: (patientId: string) => void;
}

function MedicalRecordModal({ patient, onClose, onAlertDoctor }: MedicalRecordModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              Patient Clinical Dossier & Historical Vitals
            </h3>
            <p className="text-xs text-slate-400">
              Institutional record for <span className="text-white font-semibold">{patient.name}</span> &bull; PID: <span className="font-mono text-teal-400">{patient.pid}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demographics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block">Age / Gender</span>
            <span className="font-semibold text-white">{patient.age} yrs &bull; {patient.gender}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Blood Group</span>
            <span className="font-semibold text-teal-400 font-mono">{patient.bloodGroup}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Assigned Doctor</span>
            <span className="font-semibold text-white">{patient.assignedDoctor}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Risk Status</span>
            <span
              className={cn(
                'font-bold uppercase text-[10px]',
                patient.aiRiskLevel === 'critical' ? 'text-rose-400' : 'text-emerald-400'
              )}
            >
              {patient.aiRiskLevel}
            </span>
          </div>
        </div>

        {/* AI Health Risk Triage Assessment */}
        <div
          className={cn(
            'p-4 rounded-xl border space-y-1.5',
            patient.aiRiskLevel === 'critical'
              ? 'bg-rose-950/20 border-rose-500/40'
              : 'bg-slate-950 border-slate-800'
          )}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <AlertTriangle className={patient.aiRiskLevel === 'critical' ? 'text-rose-400 w-4 h-4' : 'text-teal-400 w-4 h-4'} />
              AI Automated Clinical Risk Assessment
            </h4>
            <span className="text-[10px] font-mono text-slate-400">MedConnect AI Engine</span>
          </div>
          <p className="text-xs text-slate-300">
            {patient.aiRiskReason || 'All historical biomarkers, systolic/diastolic ratios, and pulse readings are clinically stable.'}
          </p>
        </div>

        {/* Historical Vitals Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Vitals History Ledger
          </h4>
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">BP (mmHg)</th>
                  <th className="py-2 px-3">HR (bpm)</th>
                  <th className="py-2 px-3">SpO2</th>
                  <th className="py-2 px-3">Glucose</th>
                  <th className="py-2 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {patient.historicalVitals.map((v, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-mono text-[11px]">{v.recordedAt}</td>
                    <td className="py-2 px-3 font-semibold text-white">{v.systolicBp}/{v.diastolicBp}</td>
                    <td className="py-2 px-3">{v.heartRate}</td>
                    <td className="py-2 px-3">{v.spo2}%</td>
                    <td className="py-2 px-3">{v.bloodGlucose} mg/dL</td>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">{v.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Previous Diagnoses */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Active Diagnoses & Conditions
          </h4>
          <div className="flex flex-wrap gap-2">
            {patient.diagnoses.map((d, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs border border-slate-700">
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={() => onAlertDoctor(patient.id)}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Dispatch Urgent Clinical Alert
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: REASSIGN APPOINTMENT MODAL
// ============================================================================

interface ReassignAppointmentModalProps {
  appointment: AppointmentRecord;
  doctors: DoctorStaff[];
  onClose: () => void;
  onReassign: (appId: string, newDoctorId: string, newDoctorName: string, reason: string) => void;
}

function ReassignAppointmentModal({
  appointment,
  doctors,
  onClose,
  onReassign,
}: ReassignAppointmentModalProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
  const [reason, setReason] = useState('Physician schedule conflict');

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = doctors.find(d => d.id === selectedDoctorId);
    if (!doc) {
      alert('Please select a valid physician.');
      return;
    }
    onReassign(appointment.id, doc.id, doc.name, reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">Reassign Clinical Appointment</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
            <p className="text-slate-400">Appointment: <span className="font-mono text-teal-400">{appointment.code}</span></p>
            <p className="text-white font-semibold">Patient: {appointment.patientName}</p>
            <p className="text-slate-400">Current Doctor: <span className="text-slate-200">{appointment.doctorName}</span></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Select New Attending Physician
            </label>
            <select
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} &bull; {d.department} ({d.status.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Reassignment Reason
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="Physician schedule conflict">Physician schedule conflict</option>
              <option value="Specialist escalation">Specialist escalation</option>
              <option value="Physician emergency leave">Physician emergency leave</option>
              <option value="Patient preference request">Patient preference request</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors"
            >
              Confirm Reassignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: SCHEDULE NEW APPOINTMENT MODAL
// ============================================================================

interface ScheduleAppointmentModalProps {
  doctors: DoctorStaff[];
  patients: PatientRecord[];
  onClose: () => void;
  onBook: (app: AppointmentRecord) => void;
}

function ScheduleAppointmentModal({
  doctors,
  patients,
  onClose,
  onBook,
}: ScheduleAppointmentModalProps) {
  const [patientName, setPatientName] = useState(patients[0]?.name || '');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [department, setDepartment] = useState('General Outpatient');
  const [type, setType] = useState<AppointmentRecord['type']>('In-Person');
  const [reason, setReason] = useState('Routine consultation');

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('Please specify patient name.');
      return;
    }

    const doc = doctors.find(d => d.id === doctorId);
    const newAppointment: AppointmentRecord = {
      id: crypto.randomUUID(),
      code: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName,
      patientPid: `PID-${Math.floor(100000 + Math.random() * 900000)}`,
      doctorId: doc?.id || 'doc-1',
      doctorName: doc?.name || 'On-Duty Physician',
      department,
      date,
      time,
      type,
      status: 'Confirmed',
      reason,
    };

    onBook(newAppointment);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            Schedule New Clinical Appointment
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Patient Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Samuel Jenkins"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Assigned Physician</label>
              <select
                value={doctorId}
                onChange={e => setDoctorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="General Outpatient">General Outpatient</option>
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Emergency & Acute Care">Emergency & Acute Care</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Consultation Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="In-Person">In-Person</option>
                <option value="Telehealth">Telehealth</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Clinical Reason / Notes</label>
            <input
              type="text"
              placeholder="e.g. Follow-up consultation for blood pressure monitoring"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors"
            >
              Confirm Appointment Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InstitutionDashboard;
