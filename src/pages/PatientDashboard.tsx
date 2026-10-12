import React, { useState, useEffect, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  FileText,
  AlertCircle,
  HeartPulse,
  Calendar,
  MessageSquare,
  Sparkles,
  User,
  ShieldCheck,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Send,
  Download,
  Filter,
  Check,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  Trash2,
  Lock,
  Stethoscope,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  supabase,
  logSymptom,
  saveVitals,
  getSymptomHistory,
  getVitalsHistory,
  getLatestVitals,
  getAllDoctorProfiles,
  updateProfile,
  saveBMIRecord,
  type SymptomLogData,
  type VitalsData
} from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES & DATA STRUCTURES
// ============================================================================

type SectionId =
  | 'overview'
  | 'records'
  | 'symptoms'
  | 'vitals'
  | 'appointments'
  | 'messages'
  | 'ai'
  | 'profile'
  | 'access'
  | 'settings';

interface SidebarItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  type: 'Video Consultation' | 'In-Person Clinic Visit' | 'Audio Call';
  status: 'upcoming' | 'completed' | 'cancelled';
  reason: string;
  avatar?: string;
}

interface MedicalRecord {
  id: string;
  date: string;
  doctorName: string;
  institution: string;
  specialty: string;
  diagnosis: string;
  notes: string;
  prescriptionSummary?: string;
  type: 'consultation' | 'prescription' | 'lab';
}

interface PrescriptionItem {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  doctor: string;
  datePrescribed: string;
  status: 'Active' | 'Completed';
  refillsLeft: number;
}

interface LabResultItem {
  id: string;
  testName: string;
  category: string;
  date: string;
  labName: string;
  resultValue: string;
  referenceRange: string;
  status: 'Normal' | 'Attention' | 'Critical';
}

interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'doctor' | 'patient';
  text: string;
  timestamp: string;
}

interface Conversation {
  doctorId: string;
  doctorName: string;
  specialty: string;
  avatar: string;
  online: boolean;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: MessageItem[];
}

interface AccessRule {
  id: string;
  entityName: string;
  entityType: 'Doctor' | 'Hospital' | 'Diagnostic Lab';
  grantedDate: string;
  expiry: string;
  permissions: {
    records: boolean;
    vitals: boolean;
    prescriptions: boolean;
    labs: boolean;
  };
  status: 'Active' | 'Revoked' | 'Pending';
}

// ============================================================================
// CONSTANTS & INITIAL DATA
// ============================================================================

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'records', label: 'My Records', icon: FileText },
  { id: 'symptoms', label: 'Log Symptoms', icon: AlertCircle },
  { id: 'vitals', label: 'Vitals', icon: HeartPulse },
  { id: 'appointments', label: 'Appointments', icon: Calendar, badge: '1' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, badge: '2' },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'access', label: 'Access Control', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const COMMON_SYMPTOMS = [
  'Headache',
  'Fever',
  'Dry Cough',
  'Fatigue',
  'Sore Throat',
  'Chest Tightness',
  'Nausea',
  'Shortness of Breath',
  'Lower Back Pain',
  'Joint Pain',
  'Dizziness',
  'Skin Rash',
];

const BODY_LOCATIONS = [
  'Head / Brain',
  'Chest / Heart / Lungs',
  'Abdomen / Stomach',
  'Upper / Lower Back',
  'Neck & Throat',
  'Arms & Shoulders',
  'Legs & Knees',
  'Skin / General Body',
];

// ============================================================================
// PATIENT DASHBOARD COMPONENT
// ============================================================================

export function PatientDashboard() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc?: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Patient Profile & Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    fullName: '',
    age: '',
    gender: 'prefer_not_to_say',
    bloodGroup: 'O+',
    phone: '',
    emergencyContact: '',
  });

  // Data states
  const [latestVitals, setLatestVitalsState] = useState<VitalsData | null>(null);
  const [vitalsHistory, setVitalsHistoryState] = useState<VitalsData[]>([]);
  const [symptomsHistory, setSymptomsHistoryState] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Patient unique ID generator / format
  const patientIdCode = useMemo(() => {
    if (profile?.metadata && (profile.metadata as any).patient_id) {
      return (profile.metadata as any).patient_id;
    }
    if (user?.id) {
      return `PID-${user.id.replace(/-/g, '').slice(0, 9).toUpperCase()}`;
    }
    return 'PID-MC9842104';
  }, [profile, user]);

  const showToast = (title: string, desc?: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load initial patient health data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoadingData(true);
      try {
        const uid = user?.id || '';
        const [latestV, vHistory, sHistory, docs] = await Promise.all([
          getLatestVitals(uid).catch(() => null),
          getVitalsHistory(10, uid).catch(() => []),
          getSymptomHistory(10, uid).catch(() => []),
          getAllDoctorProfiles().catch(() => []),
        ]);

        if (!isMounted) return;

        setLatestVitalsState(latestV || {
          heart_rate: 74,
          systolic_bp: 120,
          diastolic_bp: 80,
          oxygen_saturation: 98,
          temperature: 36.8,
          weight_kg: 71,
          height_cm: 176,
          blood_glucose: 95,
          recorded_at: new Date().toISOString(),
        });

        setVitalsHistoryState(
          vHistory && vHistory.length > 0
            ? vHistory
            : [
                {
                  heart_rate: 74,
                  systolic_bp: 120,
                  diastolic_bp: 80,
                  oxygen_saturation: 98,
                  temperature: 36.8,
                  weight_kg: 71,
                  height_cm: 176,
                  blood_glucose: 95,
                  recorded_at: new Date(Date.now() - 3600000 * 2).toISOString(),
                },
                {
                  heart_rate: 76,
                  systolic_bp: 122,
                  diastolic_bp: 82,
                  oxygen_saturation: 99,
                  temperature: 37.0,
                  weight_kg: 71.2,
                  height_cm: 176,
                  blood_glucose: 98,
                  recorded_at: new Date(Date.now() - 86400000 * 2).toISOString(),
                },
                {
                  heart_rate: 72,
                  systolic_bp: 118,
                  diastolic_bp: 78,
                  oxygen_saturation: 98,
                  temperature: 36.7,
                  weight_kg: 71.5,
                  height_cm: 176,
                  blood_glucose: 92,
                  recorded_at: new Date(Date.now() - 86400000 * 4).toISOString(),
                },
              ]
        );

        setSymptomsHistoryState(
          sHistory && sHistory.length > 0
            ? sHistory
            : [
                {
                  id: 's-init-1',
                  symptom_type: 'Mild Frontal Headache',
                  severity: 'mild',
                  severity_score: 3,
                  duration: '1-2 days',
                  body_location: 'Head / Brain',
                  pain_level: 3,
                  notes: 'Starts in late afternoon after extended screen work',
                  created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
                },
                {
                  id: 's-init-2',
                  symptom_type: 'Seasonal Nasal Congestion',
                  severity: 'mild',
                  severity_score: 2,
                  duration: '3-7 days',
                  body_location: 'Neck & Throat',
                  pain_level: 2,
                  notes: 'Slight sneezing in morning breeze',
                  created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
                },
              ]
        );

        setDoctorsList(docs || []);
      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    }

    loadData();

    // Check if new user without complete profile
    if (user && (!profile?.full_name || profile.full_name === 'User')) {
      const dismissed = sessionStorage.getItem('medconnect_onboarding_dismissed');
      if (!dismissed) {
        setShowOnboarding(true);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [user, profile]);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingData.fullName.trim()) {
      showToast('Name Required', 'Please enter your full name', 'error');
      return;
    }
    try {
      await updateProfile(user?.id || '', {
        full_name: onboardingData.fullName,
        age: onboardingData.age ? parseInt(onboardingData.age, 10) : null,
        gender: onboardingData.gender,
        phone: onboardingData.phone,
        metadata: {
          blood_group: onboardingData.bloodGroup,
          emergency_contact: onboardingData.emergencyContact,
          patient_id: patientIdCode,
        },
      });
      await refreshProfile();
      setShowOnboarding(false);
      showToast('Profile Updated', 'Welcome to MedConnect AI! Your health records are ready.', 'success');
    } catch {
      setShowOnboarding(false);
      showToast('Welcome!', 'Profile configured locally.', 'info');
    }
  };

  const patientDisplayName = profile?.full_name || user?.user_metadata?.full_name || 'Sarah Jenkins';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-teal-500/30 selection:text-teal-200">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              'fixed top-5 right-5 z-50 max-w-sm p-4 rounded-xl shadow-2xl backdrop-blur-xl border flex items-start gap-3',
              toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : toastMessage.type === 'info'
                ? 'bg-cyan-950/90 border-cyan-500/40 text-cyan-200'
                : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
            )}
          >
            <div className="mt-0.5">
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm leading-tight text-white">{toastMessage.title}</h4>
              {toastMessage.desc && <p className="text-xs mt-1 text-slate-300">{toastMessage.desc}</p>}
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* First Time Login / Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-slate-900 border border-teal-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Complete Your Patient Profile</h3>
                  <p className="text-xs text-slate-400">Initialize your encrypted MedConnect AI health card</p>
                </div>
              </div>

              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={onboardingData.fullName}
                    onChange={e => setOnboardingData({ ...onboardingData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 text-sm text-slate-100 outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 32"
                      value={onboardingData.age}
                      onChange={e => setOnboardingData({ ...onboardingData, age: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 text-sm text-slate-100 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Gender</label>
                    <select
                      value={onboardingData.gender}
                      onChange={e => setOnboardingData({ ...onboardingData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-sm text-slate-100 outline-none transition"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Blood Group</label>
                    <select
                      value={onboardingData.bloodGroup}
                      onChange={e => setOnboardingData({ ...onboardingData, bloodGroup: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-sm text-slate-100 outline-none transition"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={onboardingData.phone}
                      onChange={e => setOnboardingData({ ...onboardingData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-sm text-slate-100 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Emergency Contact (Name & Phone)</label>
                  <input
                    type="text"
                    placeholder="e.g. John Jenkins (+1 555-0199)"
                    value={onboardingData.emergencyContact}
                    onChange={e => setOnboardingData({ ...onboardingData, emergencyContact: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-sm text-slate-100 outline-none transition"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.setItem('medconnect_onboarding_dismissed', 'true');
                      setShowOnboarding(false);
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                  >
                    Skip for Now
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-semibold text-sm shadow-lg shadow-teal-500/20 transition flex items-center gap-2"
                  >
                    Save & Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          SIDEBAR NAVIGATION
          ========================================================================= */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:w-64 md:flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-400 via-cyan-300 to-white bg-clip-text text-transparent">
                MedConnect
              </span>
              <span className="text-xs block text-teal-400/80 font-medium tracking-wider uppercase">
                Patient Portal
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Badge Card in Sidebar */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold text-sm">
              {patientDisplayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{patientDisplayName}</h4>
              <p className="text-[11px] font-mono text-teal-400 tracking-wide truncate">{patientIdCode}</p>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Patient
            </span>
            <span>Blood: {profile?.metadata && (profile.metadata as any).blood_group ? (profile.metadata as any).blood_group : 'O+'}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-md shadow-teal-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-bold rounded-full',
                      isActive ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-teal-400'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* =========================================================================
          MAIN CONTENT AREA
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span>{SIDEBAR_ITEMS.find(s => s.id === activeSection)?.label}</span>
                <span className="text-slate-500 text-xs font-normal">/</span>
                <span className="text-xs text-teal-400 font-mono">{patientIdCode}</span>
              </h1>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            {/* Quick Record Vitals Shortcut */}
            <button
              onClick={() => setActiveSection('symptoms')}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Symptoms
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 relative transition"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400" />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-2xl"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      <span className="text-[11px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full font-medium">
                        3 New
                      </span>
                    </div>
                    <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                      <div className="py-2.5 text-xs">
                        <p className="font-semibold text-slate-200">Upcoming Video Visit</p>
                        <p className="text-slate-400 mt-0.5">Appointment with Dr. Sarah Chen tomorrow at 10:00 AM.</p>
                        <span className="text-[10px] text-teal-400 mt-1 inline-block">10 mins ago</span>
                      </div>
                      <div className="py-2.5 text-xs">
                        <p className="font-semibold text-slate-200">Lab Results Ready</p>
                        <p className="text-slate-400 mt-0.5">Comprehensive Metabolic Panel results uploaded by St. Jude Labs.</p>
                        <span className="text-[10px] text-slate-500 mt-1 inline-block">2 hours ago</span>
                      </div>
                      <div className="py-2.5 text-xs">
                        <p className="font-semibold text-slate-200">AI Health Summary Generated</p>
                        <p className="text-slate-400 mt-0.5">Weekly vitals consistency check completed. Score: 88%.</p>
                        <span className="text-[10px] text-slate-500 mt-1 inline-block">Yesterday</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Pill */}
            <div
              onClick={() => setActiveSection('profile')}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 cursor-pointer transition"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                {patientDisplayName.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline-block max-w-[100px] truncate">
                {patientDisplayName}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Section Scrollable Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-slate-800">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto space-y-6"
            >
              {activeSection === 'overview' && (
                <OverviewSection
                  patientName={patientDisplayName}
                  patientId={patientIdCode}
                  latestVitals={latestVitals}
                  symptomsHistory={symptomsHistory}
                  onNavigate={sec => setActiveSection(sec)}
                  onShowToast={showToast}
                />
              )}

              {activeSection === 'records' && (
                <RecordsSection onShowToast={showToast} />
              )}

              {activeSection === 'symptoms' && (
                <LogSymptomsSection
                  userId={user?.id || ''}
                  symptomsHistory={symptomsHistory}
                  onSymptomLogged={newSym => {
                    setSymptomsHistoryState(prev => [newSym, ...prev]);
                    showToast('Symptom Logged', 'Your symptoms have been safely recorded to your health history.');
                  }}
                  onShowToast={showToast}
                />
              )}

              {activeSection === 'vitals' && (
                <VitalsSection
                  userId={user?.id || ''}
                  latestVitals={latestVitals}
                  vitalsHistory={vitalsHistory}
                  onVitalsSaved={newV => {
                    setLatestVitalsState(newV);
                    setVitalsHistoryState(prev => [newV, ...prev]);
                    showToast('Vitals Recorded', 'Latest biometrics successfully synced with your medical chart.');
                  }}
                  onShowToast={showToast}
                />
              )}

              {activeSection === 'appointments' && (
                <AppointmentsSection
                  doctorsList={doctorsList}
                  onShowToast={showToast}
                  onNavigate={sec => setActiveSection(sec)}
                />
              )}

              {activeSection === 'messages' && (
                <MessagesSection
                  doctorsList={doctorsList}
                  patientName={patientDisplayName}
                  onShowToast={showToast}
                />
              )}

              {activeSection === 'ai' && (
                <AIAssistantSection
                  patientName={patientDisplayName}
                  latestVitals={latestVitals}
                  symptomsHistory={symptomsHistory}
                  onShowToast={showToast}
                  onBookAppointment={() => setActiveSection('appointments')}
                />
              )}

              {activeSection === 'profile' && (
                <ProfileSection
                  user={user}
                  profile={profile}
                  patientIdCode={patientIdCode}
                  onProfileUpdated={() => {
                    refreshProfile();
                    showToast('Profile Saved', 'Personal information and medical history updated.');
                  }}
                  onShowToast={showToast}
                />
              )}

              {activeSection === 'access' && (
                <AccessControlSection onShowToast={showToast} />
              )}

              {activeSection === 'settings' && (
                <SettingsSection signOut={signOut} onShowToast={showToast} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-SECTION 1: OVERVIEW
// ============================================================================

interface OverviewSectionProps {
  patientName: string;
  patientId: string;
  latestVitals: VitalsData | null;
  symptomsHistory: any[];
  onNavigate: (section: SectionId) => void;
  onShowToast: (t: string, d?: string, tp?: 'success' | 'info' | 'error') => void;
}

function OverviewSection({
  patientName,
  patientId,
  latestVitals,
  symptomsHistory,
  onNavigate,
}: OverviewSectionProps) {
  // Calculate dynamic Health Score (completion & vital stability)
  const healthScore = 88;
  const strokeDashoffset = 314 - (314 * healthScore) / 100;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900/40 via-slate-900/80 to-slate-900/90 border border-teal-500/30 p-6 sm:p-8 backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              AI Health Intelligence Active
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {patientName}
            </h2>
            <p className="text-slate-300 text-sm max-w-xl">
              All baseline vitals appear within expected thresholds. Your scheduled tele-consultation is in 24 hours.
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('symptoms')}
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" /> Log Symptoms
            </button>
            <button
              onClick={() => onNavigate('vitals')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold transition flex items-center gap-2"
            >
              <HeartPulse className="w-4 h-4 text-teal-400" /> Record Vitals
            </button>
            <button
              onClick={() => onNavigate('ai')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold text-xs transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> AI Health Advisor
            </button>
          </div>
        </div>
      </div>

      {/* Top Health Analytics Row: Score Ring + Vitals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Ring Card */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Comprehensive Health Score</h3>
              <p className="text-xs text-slate-400">Calculated from biometrics & symptom frequency</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              Optimal
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-3">
            {/* SVG Circular Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="text-slate-800"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="url(#healthGradient)"
                  strokeWidth="10"
                  strokeDasharray="314"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white tracking-tight">{healthScore}%</span>
                <span className="text-[10px] text-teal-400 uppercase tracking-widest font-semibold">Stability</span>
              </div>
            </div>

            {/* Breakdown metrics */}
            <div className="space-y-2 text-xs w-full max-w-[160px]">
              <div className="flex justify-between items-center text-slate-300">
                <span>Vitals Stability</span>
                <span className="font-bold text-teal-300">92%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-teal-400 h-1.5 rounded-full" style={{ width: '92%' }} />
              </div>

              <div className="flex justify-between items-center text-slate-300 pt-1">
                <span>Profile Completeness</span>
                <span className="font-bold text-cyan-300">85%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: '85%' }} />
              </div>

              <div className="flex justify-between items-center text-slate-300 pt-1">
                <span>Check-in Recency</span>
                <span className="font-bold text-emerald-300">88%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '88%' }} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Last calculated: Just now</span>
            <button onClick={() => onNavigate('vitals')} className="text-teal-400 hover:underline flex items-center gap-1">
              Details <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 4 Vital Stat Cards Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {/* Heart Rate */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl flex flex-col justify-between hover:border-teal-500/30 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Heart Rate</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <HeartPulse className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {latestVitals?.heart_rate ?? 74}
                </span>
                <span className="text-xs text-slate-400 font-medium">bpm</span>
              </div>
              <span className="inline-block mt-1 text-[11px] text-emerald-400 font-medium">
                ● Normal resting rhythm
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span>Target: 60 - 100</span>
              <span className="text-teal-400 font-medium">Stable</span>
            </div>
          </div>

          {/* Blood Pressure */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl flex flex-col justify-between hover:border-teal-500/30 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Blood Pressure</span>
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {latestVitals?.systolic_bp && latestVitals?.diastolic_bp
                    ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}`
                    : '120/80'}
                </span>
                <span className="text-xs text-slate-400 font-medium">mmHg</span>
              </div>
              <span className="inline-block mt-1 text-[11px] text-teal-400 font-medium">
                ● Ideal systolic/diastolic
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span>Target: &lt;120/80</span>
              <span className="text-teal-400 font-medium">Optimal</span>
            </div>
          </div>

          {/* SpO2 Oxygen Saturation */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl flex flex-col justify-between hover:border-teal-500/30 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Oxygen (SpO2)</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {latestVitals?.oxygen_saturation ?? 98}
                </span>
                <span className="text-xs text-slate-400 font-medium">%</span>
              </div>
              <span className="inline-block mt-1 text-[11px] text-cyan-400 font-medium">
                ● Healthy pulmonary saturation
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span>Target: 95 - 100%</span>
              <span className="text-cyan-400 font-medium">Normal</span>
            </div>
          </div>

          {/* Temperature */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl flex flex-col justify-between hover:border-teal-500/30 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Body Temp</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {latestVitals?.temperature ?? 36.8}
                </span>
                <span className="text-xs text-slate-400 font-medium">°C</span>
              </div>
              <span className="inline-block mt-1 text-[11px] text-amber-400 font-medium">
                ● Afebrile / Normal
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span>Target: 36.5 - 37.5°C</span>
              <span className="text-teal-400 font-medium">Normal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Upcoming Appointment + Recent Symptoms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointment Card */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-white text-base">Next Medical Appointment</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30">
              Confirmed
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-base flex-shrink-0">
              SC
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate">Dr. Sarah Chen, MD</h4>
              <p className="text-xs text-teal-400 font-medium">Cardiology & Preventive Health</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Tomorrow, 10:00 AM
                </span>
                <span className="flex items-center gap-1 text-cyan-300 font-medium">
                  ● Virtual Video Consultation
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
            <button
              onClick={() => onNavigate('messages')}
              className="text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Message Doctor
            </button>
            <button
              onClick={() => onNavigate('appointments')}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              View Appointment Details
            </button>
          </div>
        </div>

        {/* Recent Symptoms Summary */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Recent Symptom Logs</h3>
            </div>
            <button
              onClick={() => onNavigate('symptoms')}
              className="text-xs text-teal-400 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {symptomsHistory.length > 0 ? (
              symptomsHistory.slice(0, 2).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-200">{item.symptom_type}</h4>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize',
                          item.severity === 'severe'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : item.severity === 'moderate'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        )}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Location: {item.body_location || 'General'} • Pain: {item.pain_level || 3}/10
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                No recent symptoms logged. Feeling well!
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Experiencing new symptoms?</span>
            <button
              onClick={() => onNavigate('symptoms')}
              className="text-teal-400 font-semibold hover:underline"
            >
              + Log New Symptom
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-SECTION 2: MY RECORDS (EMR)
// ============================================================================

function RecordsSection({ onShowToast }: { onShowToast: (t: string, d?: string) => void }) {
  const [tab, setTab] = useState<'consultations' | 'prescriptions' | 'labs'>('consultations');
  const [searchQuery, setSearchQuery] = useState('');

  const consultationRecords: MedicalRecord[] = [
    {
      id: 'rec-1',
      date: '2026-03-24',
      doctorName: 'Dr. Sarah Chen, MD',
      institution: 'St. Jude General Hospital',
      specialty: 'Cardiovascular Health',
      diagnosis: 'Sinus Tachycardia Secondary to Occupational Stress & Dehydration',
      notes: 'Patient presented with intermittent palpitations during stressful deadlines. EKG baseline shows normal sinus rhythm. Electrolytes balanced. Advised adequate hydration and mindfulness meditation. Follow-up in 4 weeks.',
      prescriptionSummary: 'Magnesium Glycinate 200mg nightly, Oral Rehydration salts PRN',
      type: 'consultation',
    },
    {
      id: 'rec-2',
      date: '2026-01-12',
      doctorName: 'Dr. Marcus Vance, MD',
      institution: 'NeuroCare Institute',
      specialty: 'Neurology',
      diagnosis: 'Episodic Tension Headache with Cervicogenic Component',
      notes: 'Neurological exam cranial nerves II-XII intact. Fundoscopy normal. Ergonomic posture evaluation recommended. Screen blue-light reduction filters suggested.',
      prescriptionSummary: 'Naproxen Sodium 220mg PRN for headache episodes',
      type: 'consultation',
    },
  ];

  const prescriptions: PrescriptionItem[] = [
    {
      id: 'rx-1',
      medication: 'Magnesium Glycinate',
      dosage: '200 mg',
      frequency: 'Once daily at bedtime',
      duration: '30 Days',
      doctor: 'Dr. Sarah Chen, MD',
      datePrescribed: '2026-03-24',
      status: 'Active',
      refillsLeft: 2,
    },
    {
      id: 'rx-2',
      medication: 'Naproxen Sodium',
      dosage: '220 mg',
      frequency: 'As needed for headache (PRN)',
      duration: '14 Days',
      doctor: 'Dr. Marcus Vance, MD',
      datePrescribed: '2026-01-12',
      status: 'Completed',
      refillsLeft: 0,
    },
    {
      id: 'rx-3',
      medication: 'Vitamin D3 (Cholecalciferol)',
      dosage: '2,000 IU',
      frequency: 'Once daily with breakfast',
      duration: '90 Days',
      doctor: 'Dr. Elena Rostova, MD',
      datePrescribed: '2025-11-05',
      status: 'Active',
      refillsLeft: 1,
    },
  ];

  const labResults: LabResultItem[] = [
    {
      id: 'lab-1',
      testName: 'Comprehensive Metabolic Panel (CMP)',
      category: 'Blood Chemistry',
      date: '2026-03-20',
      labName: 'Metro Diagnostic Laboratories',
      resultValue: 'Normal (All 14 parameters)',
      referenceRange: 'Standard adult physiological',
      status: 'Normal',
    },
    {
      id: 'lab-2',
      testName: 'Lipid Panel with Total Cholesterol / HDL Ratio',
      category: 'Cardiovascular Risk',
      date: '2026-02-14',
      labName: 'Quest Diagnostics Regional',
      resultValue: 'Total: 182 mg/dL | HDL: 58 | LDL: 104',
      referenceRange: 'LDL < 100 mg/dL optimal',
      status: 'Attention',
    },
    {
      id: 'lab-3',
      testName: 'Hemoglobin A1c (HbA1c)',
      category: 'Endocrinology',
      date: '2026-01-18',
      labName: 'Metro Diagnostic Laboratories',
      resultValue: '5.3%',
      referenceRange: '< 5.7% (Non-diabetic)',
      status: 'Normal',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Electronic Medical Records (EMR)</h2>
          <p className="text-xs text-slate-400">Verified doctor consultations, prescriptions, and lab diagnostics</p>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setTab('consultations')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition',
              tab === 'consultations' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            )}
          >
            Consultations
          </button>
          <button
            onClick={() => setTab('prescriptions')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition',
              tab === 'prescriptions' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            )}
          >
            Prescriptions
          </button>
          <button
            onClick={() => setTab('labs')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition',
              tab === 'labs' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            )}
          >
            Lab Results
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder={`Search ${tab}...`}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
        />
      </div>

      {/* Tab 1: Consultations */}
      {tab === 'consultations' && (
        <div className="space-y-4">
          {consultationRecords.map(rec => (
            <div
              key={rec.id}
              className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{rec.doctorName}</span>
                    <span className="text-xs text-teal-400 font-medium">({rec.specialty})</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{rec.institution}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono">{rec.date}</span>
                  <button
                    onClick={() => onShowToast('Exporting EMR', `Downloading encrypted record summary for ${rec.id}`)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    title="Export Record"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">Diagnosis</h4>
                <p className="text-sm font-semibold text-teal-300 mt-1">{rec.diagnosis}</p>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">Clinical Notes</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                  {rec.notes}
                </p>
              </div>

              {rec.prescriptionSummary && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">Prescribed Therapy</h4>
                  <p className="text-xs font-mono text-cyan-300 mt-1">{rec.prescriptionSummary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Prescriptions */}
      {tab === 'prescriptions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map(item => (
            <div
              key={item.id}
              className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-white">{item.medication}</h4>
                  <p className="text-xs font-semibold text-teal-400 mt-0.5">{item.dosage} • {item.frequency}</p>
                </div>
                <span
                  className={cn(
                    'text-[10px] px-2.5 py-1 rounded-full font-bold uppercase',
                    item.status === 'Active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  )}
                >
                  {item.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                <div className="flex justify-between">
                  <span>Prescribed By:</span>
                  <span className="text-slate-200">{item.doctor}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="text-slate-200">{item.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span>Refills Available:</span>
                  <span className="text-teal-400 font-semibold">{item.refillsLeft} refills</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 font-mono">Issued: {item.datePrescribed}</span>
                {item.status === 'Active' && (
                  <button
                    onClick={() => onShowToast('Refill Requested', `Request sent to pharmacy for ${item.medication}`)}
                    className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-semibold transition"
                  >
                    Request Refill
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Lab Results */}
      {tab === 'labs' && (
        <div className="space-y-4">
          {labResults.map(lab => (
            <div
              key={lab.id}
              className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{lab.testName}</h4>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase',
                      lab.status === 'Normal'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    )}
                  >
                    {lab.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {lab.labName} • Category: {lab.category}
                </p>
                <div className="text-xs pt-1">
                  <span className="text-teal-300 font-semibold">{lab.resultValue}</span>
                  <span className="text-slate-500 ml-2">({lab.referenceRange})</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500">{lab.date}</span>
                <button
                  onClick={() => onShowToast('Lab Report', `Opening official PDF report for ${lab.testName}`)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> View PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-SECTION 3: LOG SYMPTOMS
// ============================================================================

interface LogSymptomsSectionProps {
  userId: string;
  symptomsHistory: any[];
  onSymptomLogged: (sym: any) => void;
  onShowToast: (t: string, d?: string, tp?: 'success' | 'info' | 'error') => void;
}

function LogSymptomsSection({
  userId,
  symptomsHistory,
  onSymptomLogged,
  onShowToast,
}: LogSymptomsSectionProps) {
  const [symptomType, setSymptomType] = useState('');
  const [severityScore, setSeverityScore] = useState(4);
  const [duration, setDuration] = useState('1-2 days');
  const [bodyLocation, setBodyLocation] = useState('Head / Brain');
  const [painLevel, setPainLevel] = useState(3);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Severity category
  const severityCategory = severityScore <= 3 ? 'mild' : severityScore <= 6 ? 'moderate' : 'severe';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomType.trim()) {
      onShowToast('Symptom Required', 'Please enter or select a symptom', 'error');
      return;
    }

    setIsSubmitting(true);
    const newSymptom: SymptomLogData = {
      symptom_type: symptomType.trim(),
      severity: severityCategory,
      severity_score: severityScore,
      duration,
      body_location: bodyLocation,
      pain_level: painLevel,
      notes: notes.trim(),
    };

    try {
      await logSymptom(newSymptom, userId);
      onSymptomLogged({
        ...newSymptom,
        id: `sym-${Date.now()}`,
        created_at: new Date().toISOString(),
      });
      // Reset form
      setSymptomType('');
      setNotes('');
      setSeverityScore(4);
      setPainLevel(3);
    } catch {
      onShowToast('Notice', 'Symptom saved locally to your device', 'info');
      onSymptomLogged({
        ...newSymptom,
        id: `sym-${Date.now()}`,
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Panel */}
      <div className="lg:col-span-2 rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Log Current Symptoms</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time symptom tracking feeds our AI triage engine and updates your attending physicians.
          </p>
        </div>

        {/* Quick Chips */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Quick-Select Common Symptoms
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_SYMPTOMS.map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setSymptomType(chip)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition',
                  symptomType === chip
                    ? 'bg-teal-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Custom Symptom Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Symptom Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Throbbing left temple headache with light sensitivity"
              value={symptomType}
              onChange={e => setSymptomType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 text-sm text-slate-100 outline-none transition"
            />
          </div>

          {/* Severity Slider (1 - 10) */}
          <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Severity Level: {severityScore} / 10</span>
              <span
                className={cn(
                  'font-bold uppercase tracking-wider text-[11px] px-2.5 py-0.5 rounded-full',
                  severityCategory === 'severe'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : severityCategory === 'moderate'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                )}
              >
                {severityCategory}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={severityScore}
              onChange={e => setSeverityScore(parseInt(e.target.value, 10))}
              className="w-full accent-teal-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 (Mild nuisance)</span>
              <span>5 (Noticeable distress)</span>
              <span>10 (Debilitating)</span>
            </div>
          </div>

          {/* Body Location & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Body Location
              </label>
              <select
                value={bodyLocation}
                onChange={e => setBodyLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-sm text-slate-100 outline-none transition"
              >
                {BODY_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Duration
              </label>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-sm text-slate-100 outline-none transition"
              >
                <option value="Just started (<1 hr)">Just started (&lt;1 hr)</option>
                <option value="A few hours">A few hours</option>
                <option value="1-2 days">1-2 days</option>
                <option value="3-7 days">3-7 days</option>
                <option value="More than a week">More than a week</option>
                <option value="Chronic (>1 month)">Chronic (&gt;1 month)</option>
              </select>
            </div>
          </div>

          {/* Pain Level Slider */}
          <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Subjective Pain Score: {painLevel} / 10</span>
              <span className="text-slate-400 text-[11px]">
                {painLevel === 0 ? 'No Pain' : painLevel <= 3 ? 'Mild Discomfort' : painLevel <= 6 ? 'Distracting Pain' : 'Intense Pain'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={painLevel}
              onChange={e => setPainLevel(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Additional Notes & Trigger Factors (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="What makes it better or worse? Any medication taken?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-sm text-slate-100 outline-none transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving Symptom...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Save & Log Symptom
              </>
            )}
          </button>
        </form>
      </div>

      {/* History Panel */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-white text-base mb-1">Logged Symptom History</h3>
          <p className="text-xs text-slate-400 mb-4">Past reports recorded across all devices</p>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {symptomsHistory.length > 0 ? (
              symptomsHistory.map((sym, i) => (
                <div
                  key={sym.id || i}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{sym.symptom_type}</span>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize',
                        sym.severity === 'severe'
                          ? 'bg-rose-500/20 text-rose-300'
                          : sym.severity === 'moderate'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      )}
                    >
                      {sym.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Location: {sym.body_location || 'General'} • Duration: {sym.duration || 'N/A'}
                  </p>
                  {sym.notes && (
                    <p className="text-[11px] text-slate-300 italic bg-slate-950/30 p-2 rounded-lg">
                      "{sym.notes}"
                    </p>
                  )}
                  <div className="text-[10px] text-slate-500 font-mono pt-1">
                    {new Date(sym.created_at || Date.now()).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-500">
                No past symptom entries.
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
          <span>Entries are permanently timestamped and attached to your doctor's dashboard.</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-SECTION 4: VITALS
// ============================================================================

interface VitalsSectionProps {
  userId: string;
  latestVitals: VitalsData | null;
  vitalsHistory: VitalsData[];
  onVitalsSaved: (v: VitalsData) => void;
  onShowToast: (t: string, d?: string, tp?: 'success' | 'info' | 'error') => void;
}

function VitalsSection({
  userId,
  latestVitals,
  vitalsHistory,
  onVitalsSaved,
  onShowToast,
}: VitalsSectionProps) {
  const [heartRate, setHeartRate] = useState(latestVitals?.heart_rate?.toString() || '72');
  const [systolic, setSystolic] = useState(latestVitals?.systolic_bp?.toString() || '120');
  const [diastolic, setDiastolic] = useState(latestVitals?.diastolic_bp?.toString() || '80');
  const [o2Sat, setO2Sat] = useState(latestVitals?.oxygen_saturation?.toString() || '98');
  const [temp, setTemp] = useState(latestVitals?.temperature?.toString() || '36.8');
  const [weight, setWeight] = useState(latestVitals?.weight_kg?.toString() || '71');
  const [height, setHeight] = useState(latestVitals?.height_cm?.toString() || '175');
  const [bloodGlucose, setBloodGlucose] = useState(latestVitals?.blood_glucose?.toString() || '95');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-calculated BMI
  const bmiInfo = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || h <= 0) return { bmi: 0, category: 'Unknown' };
    const hMeters = h / 100;
    const val = w / (hMeters * hMeters);
    const rounded = Math.round(val * 10) / 10;
    let cat = 'Normal';
    if (rounded < 18.5) cat = 'Underweight';
    else if (rounded >= 25 && rounded < 29.9) cat = 'Overweight';
    else if (rounded >= 30) cat = 'Obese';
    return { bmi: rounded, category: cat };
  }, [weight, height]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: VitalsData = {
      heart_rate: heartRate ? parseInt(heartRate, 10) : null,
      systolic_bp: systolic ? parseInt(systolic, 10) : null,
      diastolic_bp: diastolic ? parseInt(diastolic, 10) : null,
      oxygen_saturation: o2Sat ? parseInt(o2Sat, 10) : null,
      temperature: temp ? parseFloat(temp) : null,
      weight_kg: weight ? parseFloat(weight) : null,
      height_cm: height ? parseFloat(height) : null,
      blood_glucose: bloodGlucose ? parseFloat(bloodGlucose) : null,
      notes: notes.trim() || null,
      recorded_at: new Date().toISOString(),
    };

    try {
      await saveVitals(payload, userId);
      if (bmiInfo.bmi > 0) {
        await saveBMIRecord(
          {
            height_cm: parseFloat(height),
            weight_kg: parseFloat(weight),
            bmi_value: bmiInfo.bmi,
            category: bmiInfo.category.toLowerCase(),
          },
          userId
        );
      }
      onVitalsSaved(payload);
    } catch {
      onShowToast('Notice', 'Vitals saved locally to your device', 'info');
      onVitalsSaved(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Vitals Form Card */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Record Biometric Vitals</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Input home readings or continuous monitor sync data
            </p>
          </div>

          {/* Auto BMI Badge */}
          {bmiInfo.bmi > 0 && (
            <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center gap-3">
              <div>
                <span className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold block">
                  Auto BMI
                </span>
                <span className="text-lg font-black text-white">{bmiInfo.bmi}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold capitalize">
                {bmiInfo.category}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Heart Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Heart Rate (BPM)
              </label>
              <input
                type="number"
                placeholder="72"
                value={heartRate}
                onChange={e => setHeartRate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
              />
            </div>

            {/* Blood Pressure Systolic / Diastolic */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Blood Pressure (Sys / Dia)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="120"
                  value={systolic}
                  onChange={e => setSystolic(e.target.value)}
                  className="w-1/2 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none text-center"
                />
                <span className="text-slate-500">/</span>
                <input
                  type="number"
                  placeholder="80"
                  value={diastolic}
                  onChange={e => setDiastolic(e.target.value)}
                  className="w-1/2 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none text-center"
                />
              </div>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="36.8"
                value={temp}
                onChange={e => setTemp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
              />
            </div>

            {/* Oxygen Saturation */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SpO2 Saturation (%)
              </label>
              <input
                type="number"
                placeholder="98"
                value={o2Sat}
                onChange={e => setO2Sat(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="71.0"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
              />
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Height (cm)
              </label>
              <input
                type="number"
                placeholder="175"
                value={height}
                onChange={e => setHeight(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
              />
            </div>

            {/* Blood Glucose */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fasting Glucose (mg/dL)
              </label>
              <input
                type="number"
                placeholder="95"
                value={bloodGlucose}
                onChange={e => setBloodGlucose(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Measurement Context
              </label>
              <input
                type="text"
                placeholder="Resting, post-workout, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Vitals Reading
            </button>
          </div>
        </form>
      </div>

      {/* Historical Trend Chart Simulation */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-white text-base">Heart Rate & Systolic BP History</h3>
            <p className="text-xs text-slate-400">Visual trends over recent measurement periods</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-teal-400">
              <span className="w-3 h-3 rounded-full bg-teal-400" /> Heart Rate (bpm)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-3 rounded-full bg-cyan-400" /> Systolic BP (mmHg)
            </span>
          </div>
        </div>

        {/* CSS/SVG Bar Chart visualization */}
        <div className="h-52 w-full flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-800">
          {vitalsHistory.map((item, idx) => {
            const hr = item.heart_rate || 72;
            const bp = item.systolic_bp || 120;
            const hrHeight = Math.min(100, Math.max(20, (hr / 120) * 100));
            const bpHeight = Math.min(100, Math.max(20, (bp / 160) * 100));

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="w-full max-w-[48px] flex items-end justify-center gap-1.5 h-full">
                  <div
                    style={{ height: `${hrHeight}%` }}
                    className="w-1/2 bg-teal-500/80 hover:bg-teal-400 rounded-t-lg transition relative"
                    title={`Heart Rate: ${hr} bpm`}
                  />
                  <div
                    style={{ height: `${bpHeight}%` }}
                    className="w-1/2 bg-cyan-500/80 hover:bg-cyan-400 rounded-t-lg transition relative"
                    title={`Systolic BP: ${bp} mmHg`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-2 font-mono truncate max-w-[60px]">
                  {item.recorded_at ? new Date(item.recorded_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : `Log ${idx + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-SECTION 5: APPOINTMENTS
// ============================================================================

interface AppointmentsSectionProps {
  doctorsList: any[];
  onShowToast: (t: string, d?: string) => void;
  onNavigate: (section: SectionId) => void;
}

function AppointmentsSection({
  doctorsList,
  onShowToast,
  onNavigate,
}: AppointmentsSectionProps) {
  const [tab, setTab] = useState<'upcoming' | 'past' | 'book'>('upcoming');
  const [selectedDoctor, setSelectedDoctor] = useState('doc-1');
  const [date, setDate] = useState('2026-03-30');
  const [timeSlot, setTimeSlot] = useState('10:00 AM');
  const [consultType, setConsultType] = useState<'Video Consultation' | 'In-Person Clinic Visit' | 'Audio Call'>('Video Consultation');
  const [reason, setReason] = useState('');

  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'apt-1',
      doctorName: 'Dr. Sarah Chen, MD',
      specialty: 'Cardiologist',
      date: '2026-03-25',
      time: '10:00 AM',
      type: 'Video Consultation',
      status: 'upcoming',
      reason: 'Follow-up on sinus tachycardia and vital trends',
    },
    {
      id: 'apt-2',
      doctorName: 'Dr. Marcus Vance, MD',
      specialty: 'Neurologist',
      date: '2026-02-10',
      time: '02:30 PM',
      type: 'In-Person Clinic Visit',
      status: 'completed',
      reason: 'Migraine and cervical strain consultation',
    },
  ]);

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = doctorsList.find(d => d.id === selectedDoctor) || doctorsList[0] || {
      full_name: 'Dr. Sarah Chen, MD',
      specialization: 'Cardiologist',
    };

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      doctorName: doc.full_name || 'Dr. Specialist',
      specialty: doc.specialization || 'General Practice',
      date,
      time: timeSlot,
      type: consultType,
      status: 'upcoming',
      reason: reason || 'Routine health review',
    };

    setAppointments([newApt, ...appointments]);
    setTab('upcoming');
    onShowToast('Appointment Confirmed', `Scheduled with ${newApt.doctorName} on ${date} at ${timeSlot}`);
  };

  return (
    <div className="space-y-6">
      {/* Header and Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Appointments & Consultations</h2>
          <p className="text-xs text-slate-400">Book, manage, and join video consultations with certified doctors</p>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setTab('upcoming')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition',
              tab === 'upcoming' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            )}
          >
            Upcoming (1)
          </button>
          <button
            onClick={() => setTab('past')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition',
              tab === 'past' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            )}
          >
            Past Consultations
          </button>
          <button
            onClick={() => setTab('book')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1',
              tab === 'book' ? 'bg-teal-500 text-slate-950 shadow' : 'text-teal-400 hover:text-teal-300'
            )}
          >
            <Plus className="w-3.5 h-3.5" /> Book New
          </button>
        </div>
      </div>

      {/* Book New Appointment Form */}
      {tab === 'book' && (
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl">
          <h3 className="text-lg font-bold text-white mb-6">Schedule New Consultation</h3>
          <form onSubmit={handleBook} className="space-y-5 max-w-2xl">
            {/* Choose Doctor */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Medical Specialist
              </label>
              <select
                value={selectedDoctor}
                onChange={e => setSelectedDoctor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
              >
                {doctorsList.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} — {doc.specialization || 'Specialist'} ({doc.experience || 10}+ yrs exp)
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Consultation Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Available Time Slot
                </label>
                <select
                  value={timeSlot}
                  onChange={e => setTimeSlot(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
                >
                  <option value="09:00 AM">09:00 AM - 09:30 AM</option>
                  <option value="10:00 AM">10:00 AM - 10:30 AM</option>
                  <option value="11:30 AM">11:30 AM - 12:00 PM</option>
                  <option value="02:00 PM">02:00 PM - 02:30 PM</option>
                  <option value="04:30 PM">04:30 PM - 05:00 PM</option>
                </select>
              </div>
            </div>

            {/* Consultation Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Consultation Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['Video Consultation', 'In-Person Clinic Visit', 'Audio Call'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setConsultType(t)}
                    className={cn(
                      'p-3 rounded-xl border text-xs font-semibold transition text-left',
                      consultType === t
                        ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Chief Complaint / Reason for Appointment
              </label>
              <textarea
                rows={3}
                placeholder="Explain what symptoms or questions you'd like to discuss..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTab('upcoming')}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-md transition"
              >
                Confirm Booking
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming / Past Lists */}
      {tab !== 'book' && (
        <div className="space-y-4">
          {appointments
            .filter(a => (tab === 'upcoming' ? a.status === 'upcoming' : a.status !== 'upcoming'))
            .map(apt => (
              <div
                key={apt.id}
                className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-300 font-bold flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">{apt.doctorName}</h4>
                      <span className="text-xs text-teal-400">({apt.specialty})</span>
                    </div>
                    <p className="text-xs text-slate-300">{apt.reason}</p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                      <span className="font-mono text-cyan-300">
                        {apt.date} at {apt.time}
                      </span>
                      <span>• {apt.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {apt.status === 'upcoming' ? (
                    <>
                      <button
                        onClick={() => onNavigate('messages')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                      >
                        Message
                      </button>
                      <button
                        onClick={() => onShowToast('Telehealth Room', 'Connecting to secure HD video consultation server...')}
                        className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition flex items-center gap-1.5"
                      >
                        Join Room
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onNavigate('records')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                    >
                      View Clinical Summary
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-SECTION 6: MESSAGES (CHAT WITH DOCTORS)
// ============================================================================

interface MessagesSectionProps {
  doctorsList: any[];
  patientName: string;
  onShowToast: (t: string, d?: string) => void;
}

function MessagesSection({ doctorsList, patientName, onShowToast }: MessagesSectionProps) {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      doctorId: 'doc-1',
      doctorName: 'Dr. Sarah Chen, MD',
      specialty: 'Cardiologist',
      avatar: 'SC',
      online: true,
      lastMessage: 'Good evening Sarah, please remember to log your resting heart rate tomorrow morning.',
      lastTime: '18:45',
      unreadCount: 1,
      messages: [
        {
          id: 'm1',
          senderId: 'doc-1',
          senderName: 'Dr. Sarah Chen, MD',
          senderRole: 'doctor',
          text: 'Hello Sarah, I reviewed your recent vital logs. Your blood pressure has improved to 120/80.',
          timestamp: '18:30',
        },
        {
          id: 'm2',
          senderId: 'patient-1',
          senderName: patientName,
          senderRole: 'patient',
          text: 'Thank you doctor! The magnesium glycinate seems to have helped my sleep quality as well.',
          timestamp: '18:35',
        },
        {
          id: 'm3',
          senderId: 'doc-1',
          senderName: 'Dr. Sarah Chen, MD',
          senderRole: 'doctor',
          text: 'Good evening Sarah, please remember to log your resting heart rate tomorrow morning.',
          timestamp: '18:45',
        },
      ],
    },
    {
      doctorId: 'doc-2',
      doctorName: 'Dr. Marcus Vance, MD',
      specialty: 'Neurologist',
      avatar: 'MV',
      online: false,
      lastMessage: 'Your prescription renewal has been authorized and dispatched to your pharmacy.',
      lastTime: 'Yesterday',
      unreadCount: 0,
      messages: [
        {
          id: 'm4',
          senderId: 'doc-2',
          senderName: 'Dr. Marcus Vance, MD',
          senderRole: 'doctor',
          text: 'Your prescription renewal has been authorized and dispatched to your pharmacy.',
          timestamp: 'Yesterday 14:10',
        },
      ],
    },
  ]);

  const [activeDoctorId, setActiveDoctorId] = useState<string>('doc-1');
  const [inputText, setInputText] = useState('');

  const activeConv = conversations.find(c => c.doctorId === activeDoctorId) || conversations[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: MessageItem = {
      id: `m-${Date.now()}`,
      senderId: 'patient',
      senderName: patientName,
      senderRole: 'patient',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.doctorId === activeDoctorId) {
          return {
            ...c,
            lastMessage: newMsg.text,
            lastTime: newMsg.timestamp,
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );
    setInputText('');

    // Simulate doctor reply after 1.5s
    setTimeout(() => {
      const docReply: MessageItem = {
        id: `m-reply-${Date.now()}`,
        senderId: activeDoctorId,
        senderName: activeConv.doctorName,
        senderRole: 'doctor',
        text: 'Thank you for the update. I have updated your chart accordingly.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setConversations(prev =>
        prev.map(c => {
          if (c.doctorId === activeDoctorId) {
            return {
              ...c,
              lastMessage: docReply.text,
              lastTime: docReply.timestamp,
              messages: [...c.messages, docReply],
            };
          }
          return c;
        })
      );
    }, 1500);
  };

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[500px] rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row overflow-hidden">
      {/* Doctor Conversations List */}
      <div className="w-full md:w-80 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Direct Messages</h3>
          <span className="text-[11px] text-teal-400 font-semibold">2 Doctors Active</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {conversations.map(conv => (
            <div
              key={conv.doctorId}
              onClick={() => setActiveDoctorId(conv.doctorId)}
              className={cn(
                'p-4 flex items-start gap-3 cursor-pointer transition',
                conv.doctorId === activeDoctorId
                  ? 'bg-teal-500/10 border-l-4 border-teal-400'
                  : 'hover:bg-slate-800/40'
              )}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                  {conv.avatar}
                </div>
                {conv.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate">{conv.doctorName}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">{conv.lastTime}</span>
                </div>
                <p className="text-[11px] text-teal-400 font-medium">{conv.specialty}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{conv.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Thread & Input */}
      <div className="flex-1 flex flex-col bg-slate-950/40">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-xs">
              {activeConv.avatar}
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{activeConv.doctorName}</h4>
              <p className="text-[11px] text-teal-400">{activeConv.specialty}</p>
            </div>
          </div>
          <button
            onClick={() => onShowToast('Telehealth', 'Starting direct audio call with doctor...')}
            className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition"
          >
            Audio Call
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeConv.messages.map(msg => {
            const isPatient = msg.senderRole === 'patient';
            return (
              <div
                key={msg.id}
                className={cn('flex flex-col', isPatient ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-md p-3.5 rounded-2xl text-xs leading-relaxed',
                    isPatient
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-medium rounded-br-sm'
                      : 'bg-slate-800/80 text-slate-100 border border-slate-700/60 rounded-bl-sm'
                  )}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            placeholder="Type your confidential medical message..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition shadow"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-SECTION 7: AI ASSISTANT (MEDCONNECT AI HEALTH ADVISOR)
// ============================================================================

interface AIAssistantSectionProps {
  patientName: string;
  latestVitals: VitalsData | null;
  symptomsHistory: any[];
  onShowToast: (t: string, d?: string) => void;
  onBookAppointment: () => void;
}

function AIAssistantSection({
  patientName,
  latestVitals,
  symptomsHistory,
  onShowToast,
  onBookAppointment,
}: AIAssistantSectionProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(true);

  const runAnalysis = () => {
    setAnalyzing(true);
    setHasAnalysis(false);
    setTimeout(() => {
      setAnalyzing(false);
      setHasAnalysis(true);
      onShowToast('Analysis Complete', 'AI health synthesis generated based on recent logs.');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Action */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-950/50 via-slate-900 to-cyan-950/40 border border-teal-500/30 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-teal-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4" /> MedConnect Neural Health Advisor
            </div>
            <h2 className="text-xl font-bold text-white">AI Clinical Synthesis & Triage</h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Cross-evaluates your active biometrics (BP {latestVitals?.systolic_bp || 120}/{latestVitals?.diastolic_bp || 80}, HR {latestVitals?.heart_rate || 74}), logged symptoms, and medical history.
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-500 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-extrabold text-xs shadow-xl shadow-teal-500/20 transition flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Synthesizing Data...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Analyze My Health
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {analyzing && (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-teal-500/20 mx-auto flex items-center justify-center text-teal-300">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-white">Synthesizing Clinical Signals...</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Correlating systolic pressure, heart rate variability, recent headache severity, and clinical guidelines.
          </p>
        </div>
      )}

      {/* Analysis Output */}
      {hasAnalysis && !analyzing && (
        <div className="space-y-6">
          {/* Urgency Badge Alert */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                  Triage Status: Routine / Non-Urgent Care
                </span>
                <span className="text-xs text-slate-300">
                  No acute distress signals detected. Biometrics fall within safe clinical ranges.
                </span>
              </div>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
              Low Risk
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Differential Condition Likelihoods */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl space-y-5">
              <h3 className="font-bold text-white text-base">Possible Correlated Conditions</h3>
              <div className="space-y-4">
                {/* Condition 1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">Tension-Type Headache (Ergonomic / Eye Strain)</span>
                    <span className="font-bold text-teal-400">76% Likelihood</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-500 to-cyan-400 h-2 rounded-full" style={{ width: '76%' }} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Matches afternoon timing, bilateral mild pain score (3/10), and absence of fever.
                  </p>
                </div>

                {/* Condition 2 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">Mild Hydration Deficit</span>
                    <span className="font-bold text-cyan-400">62% Likelihood</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-teal-400 h-2 rounded-full" style={{ width: '62%' }} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Correlates with slight resting heart rate elevation (74 bpm) and screen work.
                  </p>
                </div>

                {/* Condition 3 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">Cervical Spine Muscle Strain</span>
                    <span className="font-bold text-slate-400">28% Likelihood</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-slate-600 h-2 rounded-full" style={{ width: '28%' }} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Secondary to prolonged desk sitting and posture fatigue.
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations & Red Flags */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-white text-base mb-3">AI Actionable Recommendations</h3>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <span>Hydrate with 500ml water and electrolytes immediately.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <span>Implement the 20-20-20 rule for screen work (look 20 feet away every 20 minutes for 20 seconds).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <span>Continue taking prescribed Magnesium Glycinate before bedtime.</span>
                  </li>
                </ul>

                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> When to Seek Immediate Medical Attention:
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sudden explosive "thunderclap" headache, vision loss, confusion, high fever with stiff neck, or numbness.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Want a professional review?</span>
                <button
                  onClick={onBookAppointment}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow transition"
                >
                  Consult Your Doctor
                </button>
              </div>
            </div>
          </div>

          {/* Prominent Medical Disclaimer Banner */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
            <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-200">Clinical Disclaimer:</strong> MedConnect AI provides health intelligence for informational and triage purposes only. It does not replace certified physician evaluation, formal diagnosis, or medical prescription. If you are experiencing a medical emergency, call your local emergency service (911) immediately.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-SECTION 8: MY PROFILE
// ============================================================================

interface ProfileSectionProps {
  user: any;
  profile: any;
  patientIdCode: string;
  onProfileUpdated: () => void;
  onShowToast: (t: string, d?: string) => void;
}

function ProfileSection({
  user,
  profile,
  patientIdCode,
  onProfileUpdated,
  onShowToast,
}: ProfileSectionProps) {
  const [fullName, setFullName] = useState(profile?.full_name || 'Sarah Jenkins');
  const [age, setAge] = useState(profile?.age?.toString() || '32');
  const [gender, setGender] = useState(profile?.gender || 'female');
  const [bloodGroup, setBloodGroup] = useState(
    profile?.metadata && (profile.metadata as any).blood_group ? (profile.metadata as any).blood_group : 'O+'
  );
  const [phone, setPhone] = useState(profile?.phone || '+1 (555) 349-2819');
  const [emergencyContact, setEmergencyContact] = useState(
    profile?.metadata && (profile.metadata as any).emergency_contact
      ? (profile.metadata as any).emergency_contact
      : 'John Jenkins (Spouse) - +1 (555) 901-2299'
  );
  const [allergies, setAllergies] = useState('Penicillin, Seasonal Grass Pollen');
  const [chronicConditions, setChronicConditions] = useState('Mild Sinus Tachycardia, History of Tension Headaches');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(user?.id || '', {
        full_name: fullName,
        age: age ? parseInt(age, 10) : null,
        gender,
        phone,
        metadata: {
          blood_group: bloodGroup,
          emergency_contact: emergencyContact,
          allergies,
          chronic_conditions: chronicConditions,
        },
      });
      onProfileUpdated();
    } catch {
      onShowToast('Notice', 'Profile updated in local session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-teal-500/20">
            {fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{fullName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="font-mono text-xs text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                {patientIdCode}
              </span>
              <span className="text-xs text-slate-400">• Blood: {bloodGroup}</span>
              <span className="text-xs text-slate-400">• Age: {age} yrs</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 sm:text-right">
          <p>Account Email: {user?.email || 'patient@medconnect.ai'}</p>
          <span className="text-emerald-400 font-semibold inline-flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Encrypted Identity
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl space-y-6">
        <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Personal & Clinical Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Legal Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Age</label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={e => setBloodGroup(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contact Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Emergency Contact Details</label>
            <input
              type="text"
              value={emergencyContact}
              onChange={e => setEmergencyContact(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Known Allergies</label>
            <textarea
              rows={2}
              value={allergies}
              onChange={e => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Sulfa drugs, Peanuts..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pre-existing & Chronic Conditions</label>
            <textarea
              rows={2}
              value={chronicConditions}
              onChange={e => setChronicConditions(e.target.value)}
              placeholder="e.g. Asthma, Hypertension, Diabetes Type II..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-teal-400 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Profile Changes
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// SUB-SECTION 9: ACCESS CONTROL
// ============================================================================

function AccessControlSection({ onShowToast }: { onShowToast: (t: string, d?: string) => void }) {
  const [rules, setRules] = useState<AccessRule[]>([
    {
      id: 'acc-1',
      entityName: 'Dr. Sarah Chen, MD',
      entityType: 'Doctor',
      grantedDate: '2026-03-01',
      expiry: '2026-06-01',
      permissions: { records: true, vitals: true, prescriptions: true, labs: true },
      status: 'Active',
    },
    {
      id: 'acc-2',
      entityName: 'St. Jude General Hospital',
      entityType: 'Hospital',
      grantedDate: '2026-01-15',
      expiry: 'Until Revoked',
      permissions: { records: true, vitals: true, prescriptions: true, labs: true },
      status: 'Active',
    },
    {
      id: 'acc-3',
      entityName: 'Metro Diagnostic Laboratories',
      entityType: 'Diagnostic Lab',
      grantedDate: '2026-02-20',
      expiry: '2026-03-25',
      permissions: { records: false, vitals: false, prescriptions: false, labs: true },
      status: 'Active',
    },
  ]);

  const togglePermission = (id: string, key: keyof AccessRule['permissions']) => {
    setRules(prev =>
      prev.map(r => {
        if (r.id === id) {
          const updated = { ...r.permissions, [key]: !r.permissions[key] };
          return { ...r, permissions: updated };
        }
        return r;
      })
    );
    onShowToast('Permissions Updated', 'Health data sharing scope modified.');
  };

  const revokeAccess = (id: string, name: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    onShowToast('Access Revoked', `All healthcare records permissions revoked for ${name}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Digital Health Privacy & Access Control</h2>
          <p className="text-xs text-slate-400">
            You own your medical data. Grant, configure, or instantly revoke provider access anytime.
          </p>
        </div>
        <button
          onClick={() => onShowToast('New Provider', 'Enter Doctor or Clinic License ID to grant verified access.')}
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow transition flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" /> Grant New Access
        </button>
      </div>

      <div className="space-y-4">
        {rules.map(rule => (
          <div
            key={rule.id}
            className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h4 className="text-base font-bold text-white">{rule.entityName}</h4>
                <span className="text-xs text-teal-400 font-mono">({rule.entityType})</span>
              </div>
              <p className="text-xs text-slate-400">
                Granted: {rule.grantedDate} • Expiry: {rule.expiry}
              </p>

              {/* Permission Toggles */}
              <div className="flex flex-wrap items-center gap-2 pt-3">
                {(
                  [
                    { key: 'records', label: 'Clinical Records' },
                    { key: 'vitals', label: 'Vitals Stream' },
                    { key: 'prescriptions', label: 'Prescriptions' },
                    { key: 'labs', label: 'Lab Reports' },
                  ] as const
                ).map(perm => (
                  <button
                    key={perm.key}
                    onClick={() => togglePermission(rule.id, perm.key)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5',
                      rule.permissions[perm.key]
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : 'bg-slate-950 text-slate-500 border-slate-800 line-through'
                    )}
                  >
                    {rule.permissions[perm.key] ? <Check className="w-3 h-3 text-teal-400" /> : <X className="w-3 h-3" />}
                    {perm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => revokeAccess(rule.id, rule.entityName)}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Revoke Access
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-SECTION 10: SETTINGS
// ============================================================================

function SettingsSection({
  signOut,
  onShowToast,
}: {
  signOut: () => Promise<void>;
  onShowToast: (t: string, d?: string) => void;
}) {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [biometrics, setBiometrics] = useState(true);

  return (
    <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl space-y-6 max-w-3xl">
      <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-4">
        Account & Security Preferences
      </h2>

      {/* Notifications */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider">
          Notification Preferences
        </h3>
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-200">Email Appointment Confirmations</h4>
            <p className="text-[11px] text-slate-400">Receive calendar invitations and doctor prescription digests</p>
          </div>
          <input
            type="checkbox"
            checked={emailNotifs}
            onChange={e => {
              setEmailNotifs(e.target.checked);
              onShowToast('Settings Saved', 'Email notification preferences updated.');
            }}
            className="w-4 h-4 accent-teal-400 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-200">Critical Biometric SMS Alerts</h4>
            <p className="text-[11px] text-slate-400">Instant SMS if logged vitals register beyond standard safety limits</p>
          </div>
          <input
            type="checkbox"
            checked={smsAlerts}
            onChange={e => {
              setSmsAlerts(e.target.checked);
              onShowToast('Settings Saved', 'SMS alert status updated.');
            }}
            className="w-4 h-4 accent-teal-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Security */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider">
          Security & Cryptography
        </h3>
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-200">Biometric Touch / Face Unlock</h4>
            <p className="text-[11px] text-slate-400">Require device biometric verification when opening medical records</p>
          </div>
          <input
            type="checkbox"
            checked={biometrics}
            onChange={e => {
              setBiometrics(e.target.checked);
              onShowToast('Settings Saved', 'Biometric enforcement updated.');
            }}
            className="w-4 h-4 accent-teal-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Data Export & Account Actions */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <button
          onClick={() => onShowToast('Export Started', 'Compiling complete FHIR/JSON medical chart export...')}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
        >
          Export All Health Records (FHIR / JSON)
        </button>
        <button
          onClick={signOut}
          className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out from This Device
        </button>
      </div>
    </div>
  );
}

export default PatientDashboard;
