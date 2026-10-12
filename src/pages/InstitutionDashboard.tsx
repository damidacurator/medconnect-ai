import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
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
  Info,
  Save,
  ArrowRight,
  Copy,
  ExternalLink,
  ShieldAlert,
  Stethoscope,
  MapPin,
  CalendarDays,
  FileText,
  UserPlus,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Bell,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// Types
export interface DoctorItem {
  id: string;
  docCode: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  department: string;
  status: 'active' | 'on_call' | 'on_leave';
  rating: number;
  experienceYears: number;
  consultationsCount: number;
  schedule: string;
}

export interface PatientItem {
  id: string;
  pid: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  phone: string;
  email: string;
  lastVisit: string;
  totalVisits: number;
  attendingDoctor: string;
  department: string;
  consentGranted: boolean;
}

export interface AppointmentItem {
  id: string;
  patientName: string;
  patientPid: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  type: 'In-Person' | 'Telehealth' | 'Emergency';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  roomNumber?: string;
  notes?: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  headDoctor: string;
  doctorsCount: number;
  bedsTotal: number;
  bedsOccupied: number;
  patientsToday: number;
  status: 'Operational' | 'High Capacity' | 'Critical';
  description: string;
}

export interface FacilityDetails {
  name: string;
  uniqueCode: string;
  regNumber: string;
  licenseNumber: string;
  accreditations: string[];
  facilityType: string;
  email: string;
  phone: string;
  emergencyPhone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  gpsCoords: string;
  medicalDirector: string;
  managingDirector: string;
  totalBeds: number;
  operatingHours: string;
  is24x7Emergency: boolean;
}

export interface ChannelMessage {
  id: string;
  senderName: string;
  senderRole: string;
  timestamp: string;
  content: string;
  isPriority?: boolean;
}

export function InstitutionDashboard() {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'doctors' | 'patients' | 'appointments' | 'departments' | 'reports' | 'messages' | 'profile' | 'settings'
  >('overview');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Institution Information
  const [facility, setFacility] = useState<FacilityDetails>({
    name: 'Apex Metropolitan Specialist Hospital',
    uniqueCode: 'INS-89420194',
    regNumber: 'MDC-REG-2024-8841',
    licenseNumber: 'HEFAMAA/LIC/2026/0491',
    accreditations: ['JCI Accredited', 'ISO 9001:2015', 'FMOH Tertiary Certified', 'NHIS Premier Tier'],
    facilityType: 'Tertiary Teaching & Referral Hospital',
    email: 'administration@apexmetropolitan.health',
    phone: '+234 1 800 2739',
    emergencyPhone: '+234 800 911 4357',
    website: 'https://apexmetropolitan.health',
    address: '42 Victoria Avenue, Medical District',
    city: 'Lagos',
    state: 'Lagos State',
    gpsCoords: '6.4549° N, 3.4246° E',
    medicalDirector: 'Prof. Adeyemi Adeleke, MD, FRCS',
    managingDirector: 'Dr. Clara Nwosu, MBA, MBBS',
    totalBeds: 250,
    operatingHours: '24 Hours / 7 Days a Week',
    is24x7Emergency: true,
  });

  // Sample data states
  const [doctors, setDoctors] = useState<DoctorItem[]>([
    {
      id: 'doc-1',
      docCode: 'DOC-48192',
      name: 'Dr. Kemi Ogunlesi',
      email: 'kemi.ogunlesi@apexhealth.org',
      phone: '+234 802 345 6789',
      specialization: 'Chief Cardiologist',
      department: 'Cardiology',
      status: 'active',
      rating: 4.9,
      experienceYears: 14,
      consultationsCount: 1420,
      schedule: 'Mon, Wed, Fri (08:00 - 16:00)',
    },
    {
      id: 'doc-2',
      docCode: 'DOC-77215',
      name: 'Dr. Chidi Okonkwo',
      email: 'chidi.okonkwo@apexhealth.org',
      phone: '+234 803 987 6543',
      specialization: 'Trauma & Emergency Specialist',
      department: 'Emergency & Trauma',
      status: 'on_call',
      rating: 4.8,
      experienceYears: 10,
      consultationsCount: 980,
      schedule: 'Tue, Thu, Sat (14:00 - 22:00)',
    },
    {
      id: 'doc-3',
      docCode: 'DOC-33910',
      name: 'Dr. Zainab Al-Mansoor',
      email: 'zainab.mansoor@apexhealth.org',
      phone: '+234 805 112 3344',
      specialization: 'Consultant Paediatrician',
      department: 'Paediatrics',
      status: 'active',
      rating: 5.0,
      experienceYears: 12,
      consultationsCount: 1650,
      schedule: 'Mon - Thu (09:00 - 15:00)',
    },
    {
      id: 'doc-4',
      docCode: 'DOC-59182',
      name: 'Dr. Babatunde Fashola Jr.',
      email: 'babatunde.f@apexhealth.org',
      phone: '+234 809 443 2211',
      specialization: 'Senior Orthopaedic Surgeon',
      department: 'Surgery',
      status: 'active',
      rating: 4.7,
      experienceYears: 16,
      consultationsCount: 1120,
      schedule: 'Mon, Tue, Thu (08:00 - 17:00)',
    },
    {
      id: 'doc-5',
      docCode: 'DOC-91823',
      name: 'Dr. Ifeoma Eze',
      email: 'ifeoma.eze@apexhealth.org',
      phone: '+234 818 776 5544',
      specialization: 'Consultant Neurologist',
      department: 'Neurology',
      status: 'on_leave',
      rating: 4.9,
      experienceYears: 11,
      consultationsCount: 890,
      schedule: 'Wed, Fri, Sun (10:00 - 18:00)',
    },
  ]);

  const [patients, setPatients] = useState<PatientItem[]>([
    {
      id: 'pat-1',
      pid: 'PID-992140',
      name: 'Olumide Bakare',
      age: 46,
      gender: 'Male',
      bloodGroup: 'O+',
      phone: '+234 803 234 8871',
      email: 'olumide.b@gmail.com',
      lastVisit: '2026-10-11',
      totalVisits: 8,
      attendingDoctor: 'Dr. Kemi Ogunlesi',
      department: 'Cardiology',
      consentGranted: true,
    },
    {
      id: 'pat-2',
      pid: 'PID-541289',
      name: 'Ngozi Chimamanda',
      age: 32,
      gender: 'Female',
      bloodGroup: 'A+',
      phone: '+234 802 887 4412',
      email: 'ngozi.ch@yahoo.com',
      lastVisit: '2026-10-12',
      totalVisits: 3,
      attendingDoctor: 'Dr. Zainab Al-Mansoor',
      department: 'Paediatrics',
      consentGranted: true,
    },
    {
      id: 'pat-3',
      pid: 'PID-781923',
      name: 'Ibrahim Danjuma',
      age: 58,
      gender: 'Male',
      bloodGroup: 'B+',
      phone: '+234 809 111 2233',
      email: 'ibrahim.d@outlook.com',
      lastVisit: '2026-10-09',
      totalVisits: 14,
      attendingDoctor: 'Dr. Chidi Okonkwo',
      department: 'Emergency & Trauma',
      consentGranted: false,
    },
    {
      id: 'pat-4',
      pid: 'PID-314872',
      name: 'Folashade Adeleke',
      age: 28,
      gender: 'Female',
      bloodGroup: 'O-',
      phone: '+234 814 332 9900',
      email: 'folashade.a@gmail.com',
      lastVisit: '2026-10-05',
      totalVisits: 2,
      attendingDoctor: 'Dr. Babatunde Fashola Jr.',
      department: 'Surgery',
      consentGranted: true,
    },
  ]);

  const [appointments, setAppointments] = useState<AppointmentItem[]>([
    {
      id: 'apt-1',
      patientName: 'Olumide Bakare',
      patientPid: 'PID-992140',
      doctorName: 'Dr. Kemi Ogunlesi',
      department: 'Cardiology',
      date: '2026-10-12',
      time: '09:30 AM',
      type: 'In-Person',
      status: 'Completed',
      roomNumber: 'Cardio Suite 3A',
      notes: 'Follow-up on hypertension management and ECG review',
    },
    {
      id: 'apt-2',
      patientName: 'Ngozi Chimamanda',
      patientPid: 'PID-541289',
      doctorName: 'Dr. Zainab Al-Mansoor',
      department: 'Paediatrics',
      date: '2026-10-12',
      time: '11:00 AM',
      type: 'In-Person',
      status: 'In Progress',
      roomNumber: 'Paediatrics Ward B',
      notes: 'Child routine wellness check and seasonal vaccination',
    },
    {
      id: 'apt-3',
      patientName: 'Emeka Obi',
      patientPid: 'PID-665129',
      doctorName: 'Dr. Babatunde Fashola Jr.',
      department: 'Surgery',
      date: '2026-10-12',
      time: '02:00 PM',
      type: 'In-Person',
      status: 'Scheduled',
      roomNumber: 'Surgical Consult 1',
      notes: 'Post-op knee arthroscopy recovery assessment',
    },
    {
      id: 'apt-4',
      patientName: 'Amina Bello',
      patientPid: 'PID-118274',
      doctorName: 'Dr. Chidi Okonkwo',
      department: 'Emergency & Trauma',
      date: '2026-10-12',
      time: '03:30 PM',
      type: 'Emergency',
      status: 'Scheduled',
      roomNumber: 'Triage Bay 2',
      notes: 'Acute abdominal distress evaluation',
    },
    {
      id: 'apt-5',
      patientName: 'Samuel Akintola',
      patientPid: 'PID-449102',
      doctorName: 'Dr. Ifeoma Eze',
      department: 'Neurology',
      date: '2026-10-13',
      time: '10:00 AM',
      type: 'Telehealth',
      status: 'Scheduled',
      notes: 'Teleconsultation for migraine prophylaxis review',
    },
  ]);

  const [departments, setDepartments] = useState<DepartmentItem[]>([
    {
      id: 'dep-1',
      name: 'Emergency & Trauma',
      code: 'EM-TR',
      headDoctor: 'Dr. Chidi Okonkwo',
      doctorsCount: 8,
      bedsTotal: 40,
      bedsOccupied: 34,
      patientsToday: 42,
      status: 'Critical',
      description: '24/7 Level-1 trauma response, acute critical care, and triage units.',
    },
    {
      id: 'dep-2',
      name: 'Cardiology',
      code: 'CARD',
      headDoctor: 'Dr. Kemi Ogunlesi',
      doctorsCount: 6,
      bedsTotal: 30,
      bedsOccupied: 22,
      patientsToday: 28,
      status: 'Operational',
      description: 'Comprehensive diagnostic cardiology, cath-lab, and coronary care units.',
    },
    {
      id: 'dep-3',
      name: 'Paediatrics & Neonatal',
      code: 'PAED',
      headDoctor: 'Dr. Zainab Al-Mansoor',
      doctorsCount: 7,
      bedsTotal: 35,
      bedsOccupied: 24,
      patientsToday: 31,
      status: 'Operational',
      description: 'Specialized infant, child, and NICU critical care programs.',
    },
    {
      id: 'dep-4',
      name: 'General & Orthopaedic Surgery',
      code: 'SURG',
      headDoctor: 'Dr. Babatunde Fashola Jr.',
      doctorsCount: 9,
      bedsTotal: 50,
      bedsOccupied: 44,
      patientsToday: 19,
      status: 'High Capacity',
      description: 'Four sterile laminar flow theatres with robotic-assisted laparoscopy.',
    },
    {
      id: 'dep-5',
      name: 'Neurology & Neurosurgery',
      code: 'NEURO',
      headDoctor: 'Dr. Ifeoma Eze',
      doctorsCount: 5,
      bedsTotal: 25,
      bedsOccupied: 16,
      patientsToday: 14,
      status: 'Operational',
      description: 'Neuro-diagnostic imaging, stroke interventions, and rehabilitation.',
    },
    {
      id: 'dep-6',
      name: 'Intensive Care Unit (ICU)',
      code: 'ICU',
      headDoctor: 'Prof. Adeyemi Adeleke',
      doctorsCount: 6,
      bedsTotal: 20,
      bedsOccupied: 17,
      patientsToday: 17,
      status: 'High Capacity',
      description: 'Advanced invasive mechanical ventilation and multi-organ life support.',
    },
  ]);

  const [channelMessages, setChannelMessages] = useState<ChannelMessage[]>([
    {
      id: 'msg-1',
      senderName: 'Prof. Adeyemi Adeleke',
      senderRole: 'Medical Director',
      timestamp: 'Today at 08:15 AM',
      content: 'Morning clinical handover complete. Emergency capacity is at 85%. Surge protocol stage 1 is activated.',
      isPriority: true,
    },
    {
      id: 'msg-2',
      senderName: 'Dr. Chidi Okonkwo',
      senderRole: 'Trauma Lead',
      timestamp: 'Today at 09:40 AM',
      content: 'Triage team receiving two multi-vehicle trauma casualties. Orthopaedic and anaesthesiology on standby.',
      isPriority: true,
    },
    {
      id: 'msg-3',
      senderName: 'Pharmacy Unit',
      senderRole: 'Clinical Operations',
      timestamp: 'Today at 10:20 AM',
      content: 'Fresh batch of O-negative blood reserves received and verified in cold storage.',
      isPriority: false,
    },
  ]);

  // Sync profile metadata if available from Supabase
  useEffect(() => {
    if (profile) {
      if (profile.metadata?.institutionName) {
        setFacility((prev) => ({
          ...prev,
          name: String(profile.metadata?.institutionName),
          uniqueCode: String(profile.metadata?.regNumber || prev.uniqueCode),
        }));
      }
    }
  }, [profile]);

  // Copy unique institution code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(facility.uniqueCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const navItems: Array<{
    id: 'overview' | 'doctors' | 'patients' | 'appointments' | 'departments' | 'reports' | 'messages' | 'profile' | 'settings';
    label: string;
    icon: any;
    badge?: number | string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope, badge: doctors.length },
    { id: 'patients', label: 'Patients', icon: Users, badge: patients.length },
    { id: 'appointments', label: 'Appointments', icon: Calendar, badge: appointments.length },
    { id: 'departments', label: 'Departments', icon: Building2, badge: departments.length },
    { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: '3' },
    { id: 'profile', label: 'Facility Profile', icon: Building },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-teal-500 selection:text-slate-950 font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-teal-500/20">
            <Building2 className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white leading-tight line-clamp-1">
              {facility.name}
            </h2>
            <span className="text-[11px] font-mono text-teal-400">{facility.uniqueCode}</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-slate-900/90 backdrop-blur-xl border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-0 max-md:-translate-x-full'
        )}
      >
        {/* Brand & Institution Badge */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-teal-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">MedConnect AI</h1>
              <p className="text-xs text-teal-400 font-medium tracking-wide uppercase">Enterprise Portal</p>
            </div>
          </div>

          {/* Prominent Institution Code Card */}
          <div className="bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent border border-teal-500/30 rounded-xl p-3 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Institution ID
              </span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-full font-mono">
                Verified
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-white tracking-wider">
                {facility.uniqueCode}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copy Institution Code"
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-teal-300 transition-colors"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => {
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
                  'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/10 text-teal-300 border border-teal-500/30 shadow-md shadow-teal-500/5'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-transform group-hover:scale-110',
                      isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-mono font-semibold',
                      isActive
                        ? 'bg-teal-400/20 text-teal-300'
                        : 'bg-white/5 text-slate-400 group-hover:bg-white/10'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Account / Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-semibold text-teal-400 text-sm">
              {facility.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{facility.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{facility.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Facility</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header on Desktop */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-white/10 bg-slate-900/40 backdrop-blur-md sticky top-0 z-30">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight capitalize">
                {activeTab === 'overview'
                  ? 'Institution Dashboard'
                  : activeTab.replace('-', ' ')}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-medium">
                Hospital Command Center
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live operational metrics for {facility.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">Trauma Centre: Level 1 Active</span>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 600);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin text-teal-400')} />
            </button>
          </div>
        </header>

        {/* Tab View Content */}
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <OverviewSection
                  facility={facility}
                  doctorsCount={doctors.length}
                  patientsCount={patients.length}
                  appointments={appointments}
                  departments={departments}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onCopyCode={handleCopyCode}
                  copiedCode={copiedCode}
                />
              )}

              {activeTab === 'doctors' && (
                <DoctorsSection
                  doctors={doctors}
                  departments={departments}
                  onAddDoctor={(newDoc) => setDoctors([newDoc, ...doctors])}
                />
              )}

              {activeTab === 'patients' && (
                <PatientsSection patients={patients} />
              )}

              {activeTab === 'appointments' && (
                <AppointmentsSection
                  appointments={appointments}
                  doctors={doctors}
                  departments={departments}
                  onAddAppointment={(apt) => setAppointments([apt, ...appointments])}
                  onStatusChange={(id, status) => {
                    setAppointments((prev) =>
                      prev.map((a) => (a.id === id ? { ...a, status } : a))
                    );
                  }}
                />
              )}

              {activeTab === 'departments' && (
                <DepartmentsSection
                  departments={departments}
                  doctors={doctors}
                  onAddDepartment={(dep) => setDepartments([...departments, dep])}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsSection
                  doctors={doctors}
                  patients={patients}
                  appointments={appointments}
                  departments={departments}
                />
              )}

              {activeTab === 'messages' && (
                <MessagesSection
                  messages={channelMessages}
                  onSendMessage={(text, priority) => {
                    const newMsg: ChannelMessage = {
                      id: `msg-${Date.now()}`,
                      senderName: facility.name,
                      senderRole: 'Hospital Administration',
                      timestamp: 'Just now',
                      content: text,
                      isPriority: priority,
                    };
                    setChannelMessages([newMsg, ...channelMessages]);
                  }}
                />
              )}

              {activeTab === 'profile' && (
                <FacilityProfileSection
                  facility={facility}
                  onSave={(updated) => setFacility(updated)}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsSection facility={facility} onSignOut={() => signOut()} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// =========================================================================
// 1. OVERVIEW SECTION
// =========================================================================
interface OverviewProps {
  facility: FacilityDetails;
  doctorsCount: number;
  patientsCount: number;
  appointments: AppointmentItem[];
  departments: DepartmentItem[];
  onNavigate: (tab: any) => void;
  onCopyCode: () => void;
  copiedCode: boolean;
}

function OverviewSection({
  facility,
  doctorsCount,
  patientsCount,
  appointments,
  departments,
  onNavigate,
  onCopyCode,
  copiedCode,
}: OverviewProps) {
  const todayAppointments = appointments.filter((a) => a.date === '2026-10-12').length;
  const totalBeds = departments.reduce((acc, d) => acc + d.bedsTotal, 0);
  const occupiedBeds = departments.reduce((acc, d) => acc + d.bedsOccupied, 0);
  const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100);

  const stats = [
    {
      title: 'Total Patients Served',
      value: '14,820',
      change: '+12.4%',
      period: 'vs last month',
      icon: Users,
      color: 'from-blue-500/20 to-cyan-500/20',
      accent: 'text-cyan-400',
    },
    {
      title: 'Active Doctors',
      value: doctorsCount.toString(),
      change: '100% active',
      period: 'On-duty today',
      icon: Stethoscope,
      color: 'from-teal-500/20 to-emerald-500/20',
      accent: 'text-teal-400',
    },
    {
      title: "Today's Appointments",
      value: todayAppointments.toString(),
      change: '86 total',
      period: '14 pending review',
      icon: Calendar,
      color: 'from-indigo-500/20 to-purple-500/20',
      accent: 'text-indigo-400',
    },
    {
      title: 'Departments & Wings',
      value: departments.length.toString(),
      change: `${occupancyRate}% Beds`,
      period: `${occupiedBeds}/${totalBeds} capacity`,
      icon: Building2,
      color: 'from-rose-500/20 to-amber-500/20',
      accent: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome Glass Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900/30 via-slate-900/50 to-cyan-950/40 border border-teal-500/30 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Tertiary Referral Hub
              </span>
              <span className="text-xs font-mono text-slate-400">
                MDC-REG-2024-8841
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {facility.name}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Integrated medical administration center. Manage affiliated specialists,
              monitor patient volume, coordinate triage responses, and verify electronic healthcare exchanges.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Prominent Code Pill */}
            <div className="bg-slate-950/70 border border-teal-500/40 rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 shadow-lg">
              <div>
                <p className="text-[10px] text-teal-400 uppercase font-semibold tracking-wider">Institution DOC Share Code</p>
                <p className="text-sm font-mono font-bold text-white tracking-wide">{facility.uniqueCode}</p>
              </div>
              <button
                onClick={onCopyCode}
                className="p-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 transition-colors"
                title="Copy Institution Identifier"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => onNavigate('doctors')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Affiliate Doctor</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md hover:border-teal-500/30 transition-all shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">{s.title}</span>
                <div className={cn('p-2 rounded-xl bg-gradient-to-tr border border-white/10', s.color)}>
                  <Icon className={cn('w-4 h-4', s.accent)} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {s.change}
                </span>
                <span className="text-slate-400">{s.period}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section: Quick Actions & Live Department Load */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Department Load Status */}
        <div className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Department Occupancy & Capacity</h3>
              <p className="text-xs text-slate-400">Real-time bed utilization across primary clinical wings</p>
            </div>
            <button
              onClick={() => onNavigate('departments')}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {departments.slice(0, 4).map((dept) => {
              const pct = Math.round((dept.bedsOccupied / dept.bedsTotal) * 100);
              const isHigh = pct >= 80;
              return (
                <div key={dept.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{dept.name}</span>
                      <span className="font-mono text-[10px] text-teal-400 px-1.5 py-0.5 rounded bg-teal-500/10">
                        {dept.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">
                        {dept.bedsOccupied} / {dept.bedsTotal} Beds
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          isHigh
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        )}
                      >
                        {pct}% Full
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isHigh ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-teal-500 to-cyan-400'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Institutional Actions */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white">Institutional Actions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Quick administrative workflows</p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => onNavigate('doctors')}
              className="w-full p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-white/10 hover:border-teal-500/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 group-hover:scale-105 transition-transform">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Add / Affiliate Doctor</div>
                  <div className="text-[11px] text-slate-400">Verify DOC code or invite staff</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('appointments')}
              className="w-full p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Manage Daily Schedule</div>
                  <div className="text-[11px] text-slate-400">View appointments calendar</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('departments')}
              className="w-full p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-white/10 hover:border-indigo-500/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Department Allocation</div>
                  <div className="text-[11px] text-slate-400">Assign doctors & bed quotas</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="w-full p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-white/10 hover:border-amber-500/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Export Health Reports</div>
                  <div className="text-[11px] text-slate-400">Compliance & monthly census</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span>All actions are cryptographically signed with your hospital key for regulatory audit trails.</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
        <h3 className="text-base font-semibold text-white">Live Institutional Activity Log</h3>
        <div className="divide-y divide-white/5">
          {[
            {
              title: 'New Patient Intake & Triage',
              desc: 'Patient Olumide Bakare (PID-992140) checked in at Cardiology Suite 3A.',
              time: '12 mins ago',
              icon: UserCheck,
              color: 'text-teal-400 bg-teal-500/10',
            },
            {
              title: 'Specialist Shift Started',
              desc: 'Dr. Chidi Okonkwo (Trauma & Emergency) logged in to Emergency Wing.',
              time: '45 mins ago',
              icon: Stethoscope,
              color: 'text-cyan-400 bg-cyan-500/10',
            },
            {
              title: 'Consent Signature Verified',
              desc: 'Patient Ngozi Chimamanda signed consent for digital health summary exchange.',
              time: '1 hour ago',
              icon: ShieldCheck,
              color: 'text-emerald-400 bg-emerald-500/10',
            },
            {
              title: 'ICU Bed Availability Updated',
              desc: 'Bed ICU-08 transitioned to Sterilization & Preparation state.',
              time: '2 hours ago',
              icon: Activity,
              color: 'text-indigo-400 bg-indigo-500/10',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-xl border border-white/5', item.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">{item.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 2. DOCTORS MANAGEMENT SECTION
// =========================================================================
interface DoctorsProps {
  doctors: DoctorItem[];
  departments: DepartmentItem[];
  onAddDoctor: (doc: DoctorItem) => void;
}

function DoctorsSection({ doctors, departments, onAddDoctor }: DoctorsProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);

  // Form states for adding doctor
  const [newDocCode, setNewDocCode] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocEmail, setNewDocEmail] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocDept, setNewDocDept] = useState(departments[0]?.name || 'Emergency');

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchSearch =
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.docCode.toLowerCase().includes(search.toLowerCase()) ||
        doc.specialization.toLowerCase().includes(search.toLowerCase());
      const matchDept = selectedDept === 'all' || doc.department === selectedDept;
      return matchSearch && matchDept;
    });
  }, [doctors, search, selectedDept]);

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName) return;

    const newDoc: DoctorItem = {
      id: `doc-${Date.now()}`,
      docCode: newDocCode || `DOC-${Math.floor(10000 + Math.random() * 90000)}`,
      name: newDocName,
      email: newDocEmail || `${newDocName.toLowerCase().replace(/\s+/g, '.')}@apexhealth.org`,
      phone: '+234 800 000 0000',
      specialization: newDocSpecialty || 'General Practitioner',
      department: newDocDept,
      status: 'active',
      rating: 5.0,
      experienceYears: 5,
      consultationsCount: 0,
      schedule: 'Mon - Fri (08:00 - 16:00)',
    };

    onAddDoctor(newDoc);
    setIsAddModalOpen(false);
    setNewDocName('');
    setNewDocCode('');
    setNewDocEmail('');
    setNewDocSpecialty('');
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Add Doctor Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Affiliated Medical Staff</h2>
          <p className="text-xs text-slate-400">
            Certified practitioners currently credentialed with this institution
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Affiliate Doctor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by doctor name, DOC-code or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500/50"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-200 text-sm focus:outline-none focus:border-teal-500/50"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Doctors Table / Cards */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Doctor / Specialist</th>
                <th className="px-6 py-4">DOC Code</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Consultations</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Stethoscope className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No registered doctors found matching your query.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold text-teal-300 text-sm">
                          {doc.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{doc.name}</div>
                          <div className="text-xs text-slate-400">{doc.specialization}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-teal-300 font-medium">
                      {doc.docCode}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-slate-300">
                        {doc.department}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5',
                          doc.status === 'active' && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                          doc.status === 'on_call' && 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                          doc.status === 'on_leave' && 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            doc.status === 'active' && 'bg-emerald-400',
                            doc.status === 'on_call' && 'bg-amber-400',
                            doc.status === 'on_leave' && 'bg-slate-400'
                          )}
                        />
                        {doc.status === 'active' ? 'Active' : doc.status === 'on_call' ? 'On Call' : 'On Leave'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      {doc.consultationsCount} visits
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedDoctor(doc)}
                        className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-medium border border-teal-500/20 transition-all"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Doctor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Affiliate Doctor to Institution</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name (with Title)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Aminu Kano"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Doctor DOC Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DOC-98214"
                    value={newDocCode}
                    onChange={(e) => setNewDocCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Neurosurgeon"
                    value={newDocSpecialty}
                    onChange={(e) => setNewDocSpecialty(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assigned Department
                </label>
                <select
                  value={newDocDept}
                  onChange={(e) => setNewDocDept(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  placeholder="doctor@apexhealth.org"
                  value={newDocEmail}
                  onChange={(e) => setNewDocEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-semibold text-xs shadow-lg shadow-teal-500/20"
                >
                  Register Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Profile Drawer / Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold text-teal-300 text-lg">
                  {selectedDoctor.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedDoctor.name}</h3>
                  <p className="text-xs text-teal-400 font-mono">{selectedDoctor.docCode}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 bg-white/5 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-white">{selectedDoctor.department}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Specialization:</span>
                <span className="text-white">{selectedDoctor.specialization}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Experience:</span>
                <span className="text-white">{selectedDoctor.experienceYears} Years Clinical</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Schedule:</span>
                <span className="text-teal-300 font-mono">{selectedDoctor.schedule}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Institutional Email:</span>
                <span className="text-slate-200">{selectedDoctor.email}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Patient Satisfaction:</span>
                <span className="text-amber-400 font-bold">★ {selectedDoctor.rating} / 5.0</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedDoctor(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 3. PATIENT REGISTRY SECTION
// =========================================================================
interface PatientsProps {
  patients: PatientItem[];
}

function PatientsSection({ patients }: PatientsProps) {
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);

  const filteredPatients = useMemo(() => {
    return patients.filter((pat) => {
      return (
        pat.name.toLowerCase().includes(search.toLowerCase()) ||
        pat.pid.toLowerCase().includes(search.toLowerCase()) ||
        pat.attendingDoctor.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [patients, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Institutional Patient Registry</h2>
          <p className="text-xs text-slate-400">
            Registered patient cohort with institutional admission and consultation history
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or PID Code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500/50"
          />
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-200">Patient Privacy Safeguard:</span> Institutions
          can view demographic information and records created internally at this facility.
          External longitudinal health records require patient-granted consent under the MedConnect AI trust protocol.
        </div>
      </div>

      {/* Patients Table */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">PID Code</th>
                <th className="px-6 py-4">Demographics</th>
                <th className="px-6 py-4">Last Visit</th>
                <th className="px-6 py-4">Attending Doctor</th>
                <th className="px-6 py-4">Consent Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No registered patients matching your search query.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{pat.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-teal-300">{pat.pid}</td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      {pat.age} yrs • {pat.gender} • <span className="font-semibold text-rose-400">{pat.bloodGroup}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{pat.lastVisit}</td>
                    <td className="px-6 py-4 text-xs text-slate-200">{pat.attendingDoctor}</td>
                    <td className="px-6 py-4">
                      {pat.consentGranted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Consent Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Limited Access
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPatient(pat)}
                        className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-medium border border-teal-500/20 transition-all"
                      >
                        View Record
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Demographic Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedPatient.name}</h3>
                <p className="text-xs text-teal-400 font-mono">{selectedPatient.pid}</p>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block mb-1">Age & Gender</span>
                <span className="font-semibold text-white">{selectedPatient.age} Years ({selectedPatient.gender})</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block mb-1">Blood Group</span>
                <span className="font-semibold text-rose-400">{selectedPatient.bloodGroup}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block mb-1">Contact Phone</span>
                <span className="font-semibold text-slate-200">{selectedPatient.phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block mb-1">Total Visits Here</span>
                <span className="font-semibold text-teal-300">{selectedPatient.totalVisits} Consultations</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
              <div className="text-xs font-semibold text-white">Facility Visit History</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Last Encounter:</span>
                  <span className="text-slate-200">{selectedPatient.lastVisit}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Primary Physician:</span>
                  <span className="text-slate-200">{selectedPatient.attendingDoctor}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Department:</span>
                  <span className="text-teal-400">{selectedPatient.department}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 4. APPOINTMENTS SECTION
// =========================================================================
interface AppointmentsProps {
  appointments: AppointmentItem[];
  doctors: DoctorItem[];
  departments: DepartmentItem[];
  onAddAppointment: (apt: AppointmentItem) => void;
  onStatusChange: (id: string, status: AppointmentItem['status']) => void;
}

function AppointmentsSection({
  appointments,
  doctors,
  departments,
  onAddAppointment,
  onStatusChange,
}: AppointmentsProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Appointment Form
  const [patientName, setPatientName] = useState('');
  const [patientPid, setPatientPid] = useState('');
  const [docName, setDocName] = useState(doctors[0]?.name || '');
  const [deptName, setDeptName] = useState(departments[0]?.name || '');
  const [aptDate, setAptDate] = useState('2026-10-12');
  const [aptTime, setAptTime] = useState('10:00 AM');
  const [aptType, setAptType] = useState<AppointmentItem['type']>('In-Person');

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter === 'all') return true;
      return a.status.toLowerCase() === statusFilter.toLowerCase();
    });
  }, [appointments, statusFilter]);

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName) return;

    const newApt: AppointmentItem = {
      id: `apt-${Date.now()}`,
      patientName,
      patientPid: patientPid || `PID-${Math.floor(100000 + Math.random() * 900000)}`,
      doctorName: docName,
      department: deptName,
      date: aptDate,
      time: aptTime,
      type: aptType,
      status: 'Scheduled',
    };

    onAddAppointment(newApt);
    setIsAddOpen(false);
    setPatientName('');
    setPatientPid('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Institution Appointments</h2>
          <p className="text-xs text-slate-400">
            Centralized outpatient schedules, triage intake, and telemedicine queues
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Toggle View */}
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'list' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'calendar' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              Calendar Grid
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['all', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl capitalize font-medium transition-all whitespace-nowrap',
              statusFilter === st
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
            )}
          >
            {st}
          </button>
        ))}
      </div>

      {viewMode === 'list' ? (
        /* List View */
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Physician & Dept</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Consult Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((apt) => (
                  <tr key={apt.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{apt.patientName}</div>
                      <div className="text-xs font-mono text-teal-400">{apt.patientPid}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white text-xs font-medium">{apt.doctorName}</div>
                      <div className="text-xs text-slate-400">{apt.department}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="text-slate-200 font-medium">{apt.date}</div>
                      <div className="text-slate-400">{apt.time}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-xs bg-white/5 border border-white/10 text-slate-300">
                        {apt.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium inline-block',
                          apt.status === 'Completed' && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                          apt.status === 'In Progress' && 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
                          apt.status === 'Scheduled' && 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
                          apt.status === 'Cancelled' && 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        )}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {apt.status !== 'Completed' && (
                          <button
                            onClick={() => onStatusChange(apt.id, 'Completed')}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                            title="Mark Completed"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {apt.status !== 'In Progress' && apt.status !== 'Completed' && (
                          <button
                            onClick={() => onStatusChange(apt.id, 'In Progress')}
                            className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400"
                            title="Start Check-In"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar Grid View */
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">October 2026 - Monthly Roster</h3>
            <span className="text-xs text-teal-400 font-mono">Week 42</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-2 font-bold text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}

            {Array.from({ length: 31 }, (_, i) => i + 1).map((dateNum) => {
              const isToday = dateNum === 12;
              const hasAppts = dateNum >= 11 && dateNum <= 15;
              return (
                <div
                  key={dateNum}
                  className={cn(
                    'h-20 rounded-xl p-2 border flex flex-col justify-between text-left transition-all',
                    isToday
                      ? 'bg-teal-500/15 border-teal-500/50 text-white'
                      : 'bg-slate-900/40 border-white/5 text-slate-300 hover:border-white/20'
                  )}
                >
                  <span className={cn('text-xs font-bold', isToday && 'text-teal-300')}>
                    {dateNum}
                  </span>
                  {hasAppts && (
                    <div className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded font-mono truncate">
                      {isToday ? `${appointments.length} Consults` : '3 Scheduled'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Schedule Institution Appointment</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Patient Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Akintola"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Attending Physician
                  </label>
                  <select
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Time Slot
                  </label>
                  <input
                    type="text"
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    placeholder="e.g. 10:30 AM"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-semibold text-xs shadow-lg shadow-teal-500/20"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 5. DEPARTMENTS MANAGEMENT SECTION
// =========================================================================
interface DepartmentsProps {
  departments: DepartmentItem[];
  doctors: DoctorItem[];
  onAddDepartment: (dep: DepartmentItem) => void;
}

function DepartmentsSection({ departments, doctors, onAddDepartment }: DepartmentsProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [headDoctor, setHeadDoctor] = useState(doctors[0]?.name || 'Medical Director');
  const [bedsTotal, setBedsTotal] = useState(25);
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newDep: DepartmentItem = {
      id: `dep-${Date.now()}`,
      name,
      code: code || name.slice(0, 4).toUpperCase(),
      headDoctor,
      doctorsCount: 4,
      bedsTotal: Number(bedsTotal) || 20,
      bedsOccupied: 5,
      patientsToday: 10,
      status: 'Operational',
      description: description || 'Specialist healthcare and inpatient clinical care wing.',
    };

    onAddDepartment(newDep);
    setIsAddOpen(false);
    setName('');
    setCode('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Clinical Departments & Wards</h2>
          <p className="text-xs text-slate-400">
            Operational status, head physicians, bed capacities, and doctor allocations
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Department</span>
        </button>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept) => {
          const occ = Math.round((dept.bedsOccupied / dept.bedsTotal) * 100);
          return (
            <div
              key={dept.id}
              className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-white text-base">{dept.name}</h3>
                    <span className="font-mono text-xs text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                      {dept.code}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      dept.status === 'Operational' && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                      dept.status === 'High Capacity' && 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                      dept.status === 'Critical' && 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    )}
                  >
                    {dept.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{dept.description}</p>
              </div>

              {/* Department Metrics */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="text-slate-400">Head of Wing:</span>
                  <span className="font-semibold text-white">{dept.headDoctor}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">Doctors Assigned</span>
                    <span className="text-base font-bold text-teal-300 font-mono">{dept.doctorsCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">Patients Today</span>
                    <span className="text-base font-bold text-cyan-300 font-mono">{dept.patientsToday}</span>
                  </div>
                </div>

                {/* Bed Utilization Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Bed Occupancy</span>
                    <span className="font-mono text-white">
                      {dept.bedsOccupied} / {dept.bedsTotal} ({occ}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        occ >= 80 ? 'bg-rose-400' : 'bg-teal-400'
                      )}
                      style={{ width: `${occ}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Department Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Create Clinical Department</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oncology & Radiation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Department Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ONCO"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Bed Capacity
                  </label>
                  <input
                    type="number"
                    value={bedsTotal}
                    onChange={(e) => setBedsTotal(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Head Physician
                </label>
                <select
                  value={headDoctor}
                  onChange={(e) => setHeadDoctor(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description & Facilities
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical scope, diagnostic units, and specialty services..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-semibold text-xs shadow-lg shadow-teal-500/20"
                >
                  Create Wing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 6. REPORTS & ANALYTICS SECTION
// =========================================================================
interface ReportsProps {
  doctors: DoctorItem[];
  patients: PatientItem[];
  appointments: AppointmentItem[];
  departments: DepartmentItem[];
}

function ReportsSection({ doctors, patients, appointments, departments }: ReportsProps) {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const daysData = [
    { label: 'Mon', count: 48, pct: 60 },
    { label: 'Tue', count: 64, pct: 80 },
    { label: 'Wed', count: 82, pct: 100 },
    { label: 'Thu', count: 75, pct: 92 },
    { label: 'Fri', count: 69, pct: 85 },
    { label: 'Sat', count: 34, pct: 42 },
    { label: 'Sun', count: 28, pct: 35 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Institutional Analytics & Census</h2>
          <p className="text-xs text-slate-400">
            Outpatient flows, specialty volumes, physician workloads, and institutional compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
            {(['day', 'week', 'month'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                  timeframe === t ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => alert('Exporting full institutional compliance audit report as encrypted PDF...')}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Traffic Chart Visualization */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Daily Patient Consultations</h3>
            <p className="text-xs text-slate-400">Aggregated triage and outpatient visit volume</p>
          </div>
          <span className="text-xs font-mono text-teal-400 font-bold bg-teal-500/10 px-2.5 py-1 rounded-lg">
            Total: 400 visits
          </span>
        </div>

        {/* Visual Bar chart */}
        <div className="pt-6 pb-2 grid grid-cols-7 gap-4 items-end h-52">
          {daysData.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-[11px] font-mono font-bold text-teal-300">{d.count}</span>
              <div
                className="w-full max-w-[48px] bg-gradient-to-t from-teal-600 to-cyan-400 rounded-t-xl transition-all duration-700 shadow-lg shadow-teal-500/10"
                style={{ height: `${d.pct}%` }}
              />
              <span className="text-xs font-medium text-slate-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Top Departments & Doctor Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Departments */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
          <h3 className="text-base font-semibold text-white">Top Departments by Patient Volume</h3>
          <div className="space-y-3">
            {departments.map((dept, idx) => (
              <div key={dept.id} className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-900/50 border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-teal-400 font-bold">#{idx + 1}</span>
                  <div>
                    <span className="font-semibold text-white block">{dept.name}</span>
                    <span className="text-slate-400">{dept.doctorsCount} On-Duty Specialists</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-teal-300 font-mono">
                  {dept.patientsToday * 4} Visits
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor Workload Distribution */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
          <h3 className="text-base font-semibold text-white">Practitioner Workload & Performance</h3>
          <div className="space-y-3">
            {doctors.map((doc) => (
              <div key={doc.id} className="p-3 rounded-xl bg-slate-900/50 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{doc.name}</span>
                  <span className="text-teal-300 font-mono font-semibold">{doc.consultationsCount} Cases</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{doc.specialization}</span>
                  <span className="text-amber-400 font-bold">★ {doc.rating} Rating</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 7. INSTITUTIONAL MESSAGES SECTION
// =========================================================================
interface MessagesProps {
  messages: ChannelMessage[];
  onSendMessage: (text: string, priority: boolean) => void;
}

function MessagesSection({ messages, onSendMessage }: MessagesProps) {
  const [inputText, setInputText] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [activeChannel, setActiveChannel] = useState('#all-facility');

  const channels = [
    { name: '#all-facility', label: 'All Staff Broadcast', unread: 2 },
    { name: '#emergency-wing', label: 'Emergency Trauma Hub', unread: 1 },
    { name: '#department-heads', label: 'Clinical Heads & Directors' },
    { name: '#pharmacy-lab', label: 'Diagnostics & Pharmacy' },
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), isPriority);
    setInputText('');
    setIsPriority(false);
  };

  return (
    <div className="h-[750px] rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md flex flex-col md:flex-row shadow-2xl">
      {/* Channels Sidebar */}
      <div className="w-full md:w-72 bg-slate-900/80 border-b md:border-b-0 md:border-r border-white/10 p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Institutional Communication
        </h3>
        <div className="space-y-1">
          {channels.map((ch) => (
            <button
              key={ch.name}
              onClick={() => setActiveChannel(ch.name)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left',
                activeChannel === ch.name
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <div>
                <span className="block text-white">{ch.name}</span>
                <span className="text-[10px] text-slate-400">{ch.label}</span>
              </div>
              {ch.unread && (
                <span className="px-1.5 py-0.5 rounded-full bg-teal-500 text-slate-950 font-bold text-[10px]">
                  {ch.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 flex flex-col bg-slate-950/40">
        {/* Chat Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div>
            <h4 className="text-sm font-bold text-white">{activeChannel}</h4>
            <p className="text-[11px] text-slate-400">Encrypted institutional broadcast network</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20">
            Audit-Logged Channel
          </span>
        </div>

        {/* Message List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'p-4 rounded-2xl max-w-2xl border space-y-1.5 shadow-md',
                msg.isPriority
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-100'
                  : 'bg-white/5 border-white/10 text-slate-200'
              )}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{msg.senderName}</span>
                  <span className="text-[10px] text-teal-400 px-1.5 py-0.2 rounded bg-teal-500/10">
                    {msg.senderRole}
                  </span>
                  {msg.isPriority && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.2 rounded uppercase">
                      Urgent Alert
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
              </div>
              <p className="text-xs leading-relaxed">{msg.content}</p>
            </div>
          ))}
        </div>

        {/* Message Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-slate-900/80 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Post institutional update to ${activeChannel}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500/50"
            />
            <button
              type="button"
              onClick={() => setIsPriority(!isPriority)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5',
                isPriority
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              )}
              title="Toggle Priority"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Urgent</span>
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// 8. FACILITY PROFILE SECTION
// =========================================================================
interface ProfileProps {
  facility: FacilityDetails;
  onSave: (updated: FacilityDetails) => void;
}

function FacilityProfileSection({ facility, onSave }: ProfileProps) {
  const [form, setForm] = useState<FacilityDetails>(facility);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Institution Profile & Credentials</h2>
          <p className="text-xs text-slate-400">
            Regulatory accreditation, licenses, physical location, and administrative promoters
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" /> Profile Updated Successfully
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Identity Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Legal Identity & Registration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Institution Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Facility Category
              </label>
              <input
                type="text"
                value={form.facilityType}
                onChange={(e) => setForm({ ...form, facilityType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Corporate Registration No.
              </label>
              <input
                type="text"
                value={form.regNumber}
                onChange={(e) => setForm({ ...form, regNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                State Health Operating License
              </label>
              <input
                type="text"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Location & GPS Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Physical Location & Contact
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Physical Street Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                City & State
              </label>
              <input
                type="text"
                value={`${form.city}, ${form.state}`}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                GPS Coordinates
              </label>
              <input
                type="text"
                value={form.gpsCoords}
                onChange={(e) => setForm({ ...form, gpsCoords: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Official Reception Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Emergency Hotline (24/7)
              </label>
              <input
                type="text"
                value={form.emergencyPhone}
                onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm text-rose-300 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Promoters & Governance Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Users className="w-4 h-4" /> Medical Directors & Promoters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Chief Medical Director (CMD)
              </label>
              <input
                type="text"
                value={form.medicalDirector}
                onChange={(e) => setForm({ ...form, medicalDirector: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Managing Director / CEO
              </label>
              <input
                type="text"
                value={form.managingDirector}
                onChange={(e) => setForm({ ...form, managingDirector: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Institution Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// =========================================================================
// 9. SETTINGS SECTION
// =========================================================================
interface SettingsProps {
  facility: FacilityDetails;
  onSignOut: () => void;
}

function SettingsSection({ facility, onSignOut }: SettingsProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Security & Staff Roles</h2>
        <p className="text-xs text-slate-400">
          Account authorizations, cryptographic health record keys, and session management
        </p>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
        <h3 className="text-sm font-semibold text-white">Staff Roles & Access Matrix</h3>
        <div className="divide-y divide-white/5 text-xs text-slate-300">
          {[
            { role: 'Administrator / Medical Director', desc: 'Full institutional configuration and practitioner accreditation rights', badge: 'Tier 1' },
            { role: 'Senior Consultant / Department Lead', desc: 'Can admit patients, approve referrals, and sign discharge summaries', badge: 'Tier 2' },
            { role: 'Nurse / Triage Officer', desc: 'Intake triage, vitals recording, and bed allocation', badge: 'Tier 3' },
            { role: 'Records Clerk / Front Desk', desc: 'Appointment scheduling and patient identity verification', badge: 'Tier 4' },
          ].map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">{item.role}</span>
                <span className="text-slate-400">{item.desc}</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-teal-500/10 text-teal-300 font-mono text-[11px] font-bold">
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
        <h3 className="text-sm font-semibold text-white">Cryptographic Node Identifier</h3>
        <p className="text-xs text-slate-400">
          This unique identifier verifies that patient consultations recorded through MedConnect AI originate from a certified institutional entity.
        </p>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-teal-500/30 flex items-center justify-between font-mono text-xs">
          <span className="text-teal-300">{facility.uniqueCode}</span>
          <span className="text-emerald-400 font-semibold">Active & Audited</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-6 backdrop-blur-md space-y-3">
        <h3 className="text-sm font-bold text-rose-300">Session Controls</h3>
        <p className="text-xs text-rose-200/80">
          Signing out terminates active command center tokens on this terminal.
        </p>
        <button
          onClick={onSignOut}
          className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-500/20"
        >
          Sign Out Institution
        </button>
      </div>
    </div>
  );
}
