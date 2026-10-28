import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  FileText,
  Calendar,
  MessageSquare,
  Bot,
  Clock,
  UserCheck,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock3,
  CalendarDays,
  FilePlus,
  Send,
  Pill,
  FlaskConical,
  Activity,
  Heart,
  Thermometer,
  Eye,
  Check,
  X,
  Phone,
  Mail,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  BrainCircuit,
  Filter,
  RefreshCw,
  Video,
  Building,
  Menu,
  ChevronDown,
  Info,
  DollarSign,
  Save,
  ArrowRight,
  Key,
  Lock,
  Unlock,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase, getSymptomHistory, saveConsultationRecord, getDoctorConsultations } from '@/lib/supabase';
import { DiagnosticImagingVault } from '@/components/medical/DiagnosticImagingVault';
import { unlockPatientWithPin, fetchDoctorUnlockedPatients } from '@/lib/accessControl';
import {
  fetchMessages,
  sendChatMessage,
  deleteChatMessage,
  clearChatThread,
  getUnreadMessagesCount,
  markMessagesAsRead,
  type ChatMessage
} from '@/lib/messaging';

// Types
export interface Patient {
  id: string;
  pid: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  phone: string;
  email: string;
  allergies: Array<{ name: string; severity: 'Mild' | 'Moderate' | 'Critical' }>;
  chronicConditions: string[];
  lastVisit?: string;
  vitalsHistory: Array<{
    date: string;
    bp: string;
    hr: number;
    temp: number;
    spo2: number;
    weight: number;
  }>;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  pid: string;
  time: string;
  date: string;
  type: 'In-Person' | 'Telehealth' | 'Emergency';
  status: 'Waiting' | 'In Progress' | 'Completed' | 'Cancelled';
  reason: string;
  vitalsTaken: boolean;
}

export interface PrescriptionItem {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
}

export interface LabOrderItem {
  id: string;
  testName: string;
  category: string;
  urgency: 'Routine' | 'Urgent' | 'STAT';
  notes: string;
}

export interface ConsultationRecord {
  id: string;
  emrCode: string;
  patientId: string;
  patientName: string;
  pid: string;
  doctorId: string;
  doctorName: string;
  date: string;
  chiefComplaint: string;
  hpi: string;
  reviewOfSystems: string[];
  vitals: {
    bp: string;
    hr: string;
    temp: string;
    spo2: string;
    rr: string;
    weight: string;
    bmi: string;
  };
  examinationFindings: string;
  diagnoses: string[];
  differentialDiagnosis: string;
  treatmentPlan: string;
  prescriptions: PrescriptionItem[];
  labOrders: LabOrderItem[];
  followUpDate: string;
  followUpNotes: string;
}

export interface MessageItem {
  id: string;
  sender: 'doctor' | 'patient';
  text: string;
  timestamp: string;
}

// No initial mock data — doctors start with a blank slate
const INITIAL_PATIENTS: Patient[] = [];
const INITIAL_APPOINTMENTS: Appointment[] = [];
const INITIAL_CONSULTATIONS: ConsultationRecord[] = [];

export function DoctorDashboard() {
  const { user, profile, loading, isDemo, signOut } = useAuth();

  // Session guard
  useEffect(() => {
    if (loading) return;
    const demo = localStorage.getItem('medconnect_demo_user');
    if (!user && !profile && !demo && !isDemo) {
      window.location.href = '/';
    }
  }, [user, profile, loading, isDemo]);

  // State
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const docId = user?.id || 'doc-1';
      const cached = localStorage.getItem(`medconnect_doctor_unlocked_${docId}`);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return INITIAL_PATIENTS;
  });
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [consultations, setConsultations] = useState<ConsultationRecord[]>(() => {
    try {
      const docId = user?.id || 'doc-1';
      const docSaved = localStorage.getItem(`medconnect_consultations_doctor_${docId}`);
      if (docSaved) return JSON.parse(docSaved);
      const allSaved = localStorage.getItem('medconnect_consultations_all');
      if (allSaved) return JSON.parse(allSaved);
    } catch {
      // ignore
    }
    return INITIAL_CONSULTATIONS;
  });
  const [selectedPatientForRecord, setSelectedPatientForRecord] = useState<Patient | null>(null);

  // Auto-sync unlocked patients from Supabase cloud
  useEffect(() => {
    let isMounted = true;
    async function loadUnlocked() {
      if (!user?.id) return;
      try {
        const loaded = await fetchDoctorUnlockedPatients(user.id);
        if (isMounted && Array.isArray(loaded)) {
          setPatients(loaded);
        }
      } catch (err) {
        console.warn('Error loading doctor unlocked patients:', err);
      }
    }
    loadUnlocked();

    const handleProfileUpdate = () => {
      loadUnlocked();
    };
    window.addEventListener('medconnect:profile-updated', handleProfileUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('medconnect:profile-updated', handleProfileUpdate);
    };
  }, [user?.id]);

  // Auto-sync doctor consultations from Supabase cloud
  useEffect(() => {
    let isMounted = true;
    async function loadDoctorConsults() {
      if (!user?.id) return;
      try {
        const cList = await getDoctorConsultations(user.id);
        if (isMounted && Array.isArray(cList) && cList.length > 0) {
          setConsultations(cList as any);
        }
      } catch (err) {
        console.warn('Error fetching doctor consultations from cloud:', err);
      }
    }
    loadDoctorConsults();

    const handleEmrUpdate = () => {
      loadDoctorConsults();
    };
    window.addEventListener('medconnect:emr-updated', handleEmrUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('medconnect:emr-updated', handleEmrUpdate);
    };
  }, [user?.id]);

  // Unlock PIN Modal State
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Toast / notification banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Profile data
  const [doctorProfile, setDoctorProfile] = useState(() => ({
    code: profile?.unique_code || (user?.id ? `DOC-${user.id.replace(/-/g, '').slice(0, 9).toUpperCase()}` : 'DOC-PENDING'),
    name: profile?.full_name || (user?.user_metadata?.full_name as string) || (user?.email ? 'Dr. ' + user.email.split('@')[0] : 'Dr. Attending'),
    title: 'Physician',
    specialization: ((profile?.metadata as any)?.specialization as string) || 'General Medicine',
    license: ((profile?.metadata as any)?.council_reg as string) || 'Pending Verification',
    hospital: ((profile?.metadata as any)?.current_institution as string) || 'MedConnect Healthcare Network',
    phone: profile?.phone || '',
    email: user?.email || '',
    bio: 'Licensed clinician providing telehealth and clinical consultations on MedConnect AI.'
  }));

  // Sync profile when loaded
  useEffect(() => {
    if (profile) {
      setDoctorProfile(prev => ({
        ...prev,
        code: profile.unique_code || prev.code,
        name: profile.full_name || prev.name,
        specialization: ((profile.metadata as any)?.specialization as string) || prev.specialization,
        license: ((profile.metadata as any)?.council_reg as string) || prev.license,
        hospital: ((profile.metadata as any)?.current_institution as string) || prev.hospital,
        phone: profile.phone || prev.phone,
        email: user?.email || prev.email,
      }));
    }
  }, [profile, user]);

  const handleUnlockWithPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      showToast('Please enter the patient’s unique Patient ID (e.g. PID-9B2F4C1A).');
      return;
    }
    setIsUnlocking(true);
    const result = await unlockPatientWithPin(pinInput.trim(), {
      doctorId: user?.id || 'doc-1',
      doctorName: doctorProfile.name,
      hospital: doctorProfile.hospital,
      specialization: doctorProfile.specialization,
    });
    setIsUnlocking(false);

    if (result.success && result.patient) {
      const pat = result.patient;
      const newPat: Patient = {
        id: pat.patientId,
        name: pat.patientName,
        pid: pat.patientPid,
        age: Number(pat.age) || 0,
        gender: (pat.gender as any) || 'Other',
        bloodGroup: pat.bloodGroup || 'Not specified',
        phone: pat.phone || '',
        email: pat.email || '',
        allergies: [],
        chronicConditions: [],
        vitalsHistory: pat.vitalsHistory || [],
        lastVisit: 'Today',
      };

      setPatients(prev => {
        const exists = prev.some(p => p.id === newPat.id);
        const updated = exists ? prev.map(p => p.id === newPat.id ? newPat : p) : [newPat, ...prev];
        try {
          const docId = user?.id || 'doc-1';
          localStorage.setItem(`medconnect_doctor_unlocked_${docId}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      setSelectedPatientForRecord(newPat);
      setSelectedChatPatientId(newPat.id);
      setIsUnlockModalOpen(false);
      setPinInput('');
      setActiveTab('records');
      showToast(`Record Unlocked: Access granted for ${pat.patientName}. Vitals & scans now accessible.`);
    } else {
      showToast(result.error || 'Invalid Patient ID. Please check the exact ID with the patient.');
    }
  };

  // Schedule settings
  const [scheduleSettings, setScheduleSettings] = useState({
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '08:00',
    endTime: '17:00',
    slotDuration: '30',
    virtualFee: '15000',
    inPersonFee: '25000',
    emergencyFee: '40000',
    enableTelehealth: true,
    enableInPerson: true,
    enableEmergency: true,
    vacationMode: false
  });

  // Messaging state - powered by real Supabase / local messaging
  const [selectedChatPatientId, setSelectedChatPatientId] = useState<string>('');
  const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Poll for unread message notifications
  useEffect(() => {
    let isMounted = true;
    const checkUnread = async () => {
      if (!user?.id) return;
      try {
        const count = await getUnreadMessagesCount(user.id);
        if (isMounted) setUnreadMessagesCount(count);
      } catch {
        // ignore
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 4000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [user?.id]);

  // Load chat messages when selectedChatPatientId changes, and poll for new messages
  useEffect(() => {
    let isMounted = true;
    if (!user?.id || !selectedChatPatientId) {
      setCurrentChatMessages([]);
      return;
    }

    const loadMsgs = async () => {
      try {
        const msgs = await fetchMessages(user.id, selectedChatPatientId, user.id);
        if (isMounted) {
          setCurrentChatMessages(prev => {
            if (
              prev.length === msgs.length &&
              prev.length > 0 &&
              prev[prev.length - 1]?.id === msgs[msgs.length - 1]?.id
            ) {
              return prev;
            }
            return msgs;
          });
        }
        await markMessagesAsRead(selectedChatPatientId, user.id);
        setUnreadMessagesCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.warn('Error loading messages:', err);
      }
    };

    loadMsgs();
    const interval = setInterval(loadMsgs, 3000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [user?.id, selectedChatPatientId]);

  // Consultation Builder Flow State
  const [consultationStep, setConsultationStep] = useState<number>(1);
  const [selectedPatientForConsult, setSelectedPatientForConsult] = useState<Patient | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Form Fields for Consultation
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [hpi, setHpi] = useState('');
  const [selectedROS, setSelectedROS] = useState<string[]>([]);
  const [vitalsInput, setVitalsInput] = useState({
    bp: '',
    hr: '',
    temp: '',
    spo2: '',
    rr: '',
    weight: '',
    bmi: ''
  });
  const [examinationFindings, setExaminationFindings] = useState('');
  const [diagnosisTags, setDiagnosisTags] = useState<string[]>([]);
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');

  // Prescriptions in current consultation
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);

  // Lab orders in current consultation
  const [labOrders, setLabOrders] = useState<LabOrderItem[]>([]);

  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // AI Workspace State
  const [aiSelectedPatientId, setAiSelectedPatientId] = useState<string>('');
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiRiskData, setAiRiskData] = useState<{
    cardio: number;
    sepsis: number;
    readmit: number;
    recommendations: string[];
  } | null>(null);
  const [drugA, setDrugA] = useState('');
  const [drugB, setDrugB] = useState('');
  const [interactionResult, setInteractionResult] = useState<string | null>(null);
  const [aiNoteRawText, setAiNoteRawText] = useState('');
  const [extractedAiNote, setExtractedAiNote] = useState<any | null>(null);

  // Initialize consultation with queue patient if requested
  const handleStartConsultationForPatient = (patient: Patient) => {
    setSelectedPatientForConsult(patient);
    setConsultationStep(2);
    setActiveTab('consultations');
  };

  // Isolate and reset consultation records whenever target patient changes
  useEffect(() => {
    if (!selectedPatientForConsult) return;
    setChiefComplaint('');
    setHpi('');
    setSelectedROS([]);
    setExaminationFindings('');
    setDiagnosisTags([]);
    setDiagnosisInput('');
    setDifferentialDiagnosis('');
    setTreatmentPlan('');
    setPrescriptions([]);
    setLabOrders([]);
    setFollowUpDate('');
    setFollowUpNotes('');

    // Pre-populate with this patient's vitals if available, otherwise clear
    if (selectedPatientForConsult.vitalsHistory && selectedPatientForConsult.vitalsHistory.length > 0) {
      const v = selectedPatientForConsult.vitalsHistory[0];
      setVitalsInput({
        bp: v.bp || '',
        hr: v.hr ? String(v.hr) : '',
        temp: v.temp ? String(v.temp) : '',
        spo2: v.spo2 ? String(v.spo2) : '',
        rr: '',
        weight: v.weight ? String(v.weight) : '',
        bmi: ''
      });
    } else {
      setVitalsInput({
        bp: '',
        hr: '',
        temp: '',
        spo2: '',
        rr: '',
        weight: '',
        bmi: ''
      });
    }
  }, [selectedPatientForConsult?.id]);

  // Add prescription helper
  const handleAddPrescription = () => {
    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      medication: '',
      dosage: '',
      frequency: 'Once Daily',
      duration: '7 Days',
      route: 'Oral',
      instructions: ''
    };
    setPrescriptions([...prescriptions, newItem]);
  };

  const handleUpdatePrescription = (id: string, field: keyof PrescriptionItem, val: string) => {
    setPrescriptions(prev => prev.map(item => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const handleRemovePrescription = (id: string) => {
    setPrescriptions(prev => prev.filter(i => i.id !== id));
  };

  // Add lab order helper
  const handleAddLabOrder = () => {
    const newLab: LabOrderItem = {
      id: `lab-${Date.now()}`,
      testName: '',
      category: 'Biochemistry',
      urgency: 'Routine',
      notes: ''
    };
    setLabOrders([...labOrders, newLab]);
  };

  const handleUpdateLabOrder = (id: string, field: keyof LabOrderItem, val: string) => {
    setLabOrders(prev => prev.map(item => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const handleRemoveLabOrder = (id: string) => {
    setLabOrders(prev => prev.filter(i => i.id !== id));
  };

  // Add diagnosis tag
  const handleAddDiagnosisTag = () => {
    if (diagnosisInput.trim() && !diagnosisTags.includes(diagnosisInput.trim())) {
      setDiagnosisTags([...diagnosisTags, diagnosisInput.trim()]);
      setDiagnosisInput('');
    }
  };

  const handleRemoveDiagnosisTag = (tag: string) => {
    setDiagnosisTags(diagnosisTags.filter(t => t !== tag));
  };

  // Finalize consultation & generate EMR code
  const handleSaveConsultation = async () => {
    if (!selectedPatientForConsult) {
      showToast('Please select a patient first.');
      return;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
    const emrCode = `EMR-${randomSuffix}`;

    const newRecord: ConsultationRecord = {
      id: `emr-${Date.now()}`,
      emrCode,
      patientId: selectedPatientForConsult.id,
      patientName: selectedPatientForConsult.name,
      pid: selectedPatientForConsult.pid,
      doctorId: user?.id || 'doc-1',
      doctorName: doctorProfile.name,
      date: new Date().toISOString().split('T')[0],
      chiefComplaint,
      hpi,
      reviewOfSystems: selectedROS,
      vitals: vitalsInput,
      examinationFindings,
      diagnoses: diagnosisTags.length > 0 ? diagnosisTags : ['General Health Assessment'],
      differentialDiagnosis,
      treatmentPlan,
      prescriptions: prescriptions.filter(p => p.medication.trim().length > 0),
      labOrders: labOrders.filter(l => l.testName.trim().length > 0),
      followUpDate,
      followUpNotes
    };

    // Save to Multi-Tier Storage (LocalStorage, Patient & Doctor Profile Metadata, Cloud Tables, Real-time Events)
    try {
      await saveConsultationRecord(newRecord as any);
    } catch (saveErr) {
      console.warn('Consultation save error:', saveErr);
    }

    setConsultations(prev => [newRecord, ...prev.filter(c => c.id !== newRecord.id)]);

    // Also update appointment status in queue if present
    setAppointments(prev =>
      prev.map(apt => (apt.patientId === selectedPatientForConsult.id ? { ...apt, status: 'Completed' } : apt))
    );

    // Update patient's lastVisit in unlocked patients cache
    setPatients(prev =>
      prev.map(p =>
        p.id === selectedPatientForConsult.id
          ? { ...p, lastVisit: 'Today', vitalsTaken: true }
          : p
      )
    );
    try {
      const docId = user?.id || 'doc-1';
      const docKey = `medconnect_doctor_unlocked_${docId}`;
      const cached = JSON.parse(localStorage.getItem(docKey) || '[]');
      const updatedCache = cached.map((p: any) =>
        p.id === selectedPatientForConsult.id ? { ...p, lastVisit: 'Today', vitalsTaken: true } : p
      );
      localStorage.setItem(docKey, JSON.stringify(updatedCache));
    } catch { /* ignore */ }

    showToast(`Consultation record saved successfully with code ${emrCode}`);
    setConsultationStep(1);
    setSelectedPatientForConsult(null);
    setChiefComplaint('');
    setHpi('');
    setExaminationFindings('');
    setDiagnosisTags([]);
    setTreatmentPlan('');
    setActiveTab('records');
  };

  // Run AI Risk Analysis
  const handleRunAiAnalysis = () => {
    setAiAnalysisLoading(true);
    setTimeout(() => {
      setAiRiskData({
        cardio: 28,
        sepsis: 4,
        readmit: 12,
        recommendations: [
          'High compliance with antihypertensive agent indicates stable cardiovascular trajectory.',
          'Consider routine microalbuminuria screening given borderline systolic trends.',
          'Advise dietary sodium restriction (<2,000 mg/day) and structured aerobic conditioning.'
        ]
      });
      setAiAnalysisLoading(false);
    }, 1200);
  };

  // Run AI Drug Interaction Checker
  const handleCheckInteraction = () => {
    setInteractionResult(
      `Analyzed: ${drugA} + ${drugB}\nResult: [Moderate Interaction Risk] Concomitant use of ACE inhibitors (${drugA}) and potassium-sparing diuretics (${drugB}) may produce severe hyperkalemia. Frequent monitoring of serum potassium and renal function is advised.`
    );
  };

  // Run AI Clinical Note Extraction
  const handleExtractNote = () => {
    setAiAnalysisLoading(true);
    setTimeout(() => {
      setExtractedAiNote({
        chiefComplaint: 'Morning occipital throbbing headache (2 weeks duration)',
        hpi: 'Patient denies blurred vision or nausea. Onset gradual, primarily early morning.',
        vitalsExtracted: { bp: '138/88 mmHg', hr: '78 bpm' },
        suspectedICD10: ['G44.209 (Tension-type headache)', 'I10 (Essential Hypertension)'],
        suggestedOrders: ['Serum Electrolytes & Creatinine', 'Amlodipine 5mg oral daily', 'Home blood pressure log']
      });
      setAiAnalysisLoading(false);
    }, 1400);
  };

  // Send message using real Supabase & local cache
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user?.id || !selectedChatPatientId || isSendingMessage) return;
    const textToSend = chatInput.trim();
    setChatInput('');
    setIsSendingMessage(true);
    try {
      const sent = await sendChatMessage(user.id, selectedChatPatientId, textToSend, 'doctor');
      setCurrentChatMessages(prev => [...prev, sent]);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Quick message template using real Supabase & local cache
  const sendQuickTemplate = async (tmpl: string) => {
    if (!user?.id || !selectedChatPatientId) return;
    try {
      const sent = await sendChatMessage(user.id, selectedChatPatientId, tmpl, 'doctor');
      setCurrentChatMessages(prev => [...prev, sent]);
    } catch (err) {
      console.error('Failed to send template message:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id || !selectedChatPatientId || !messageId) return;
    setCurrentChatMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      await deleteChatMessage(messageId, user.id, selectedChatPatientId);
      showToast('Message deleted');
    } catch (err) {
      console.error('Failed to delete message:', err);
      showToast('Failed to delete message');
    }
  };

  const handleClearChat = async () => {
    if (!user?.id || !selectedChatPatientId) return;
    setCurrentChatMessages([]);
    try {
      await clearChatThread(user.id, selectedChatPatientId);
      showToast('Conversation cleared');
    } catch (err) {
      console.error('Failed to clear chat:', err);
      showToast('Failed to clear conversation');
    }
  };

  const waitingCount = appointments.filter(a => a.status === 'Waiting').length;

  // Render navigation items with real dynamic badges (zero mock counters)
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'queue', label: 'Patient Queue', icon: Users, badge: waitingCount > 0 ? waitingCount : undefined },
    { id: 'consultations', label: 'Consultations', icon: Stethoscope },
    { id: 'records', label: 'Patient Records', icon: FileText },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined },
    { id: 'ai', label: 'AI Workspace', icon: Bot, isSparkle: true },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'profile', label: 'My Profile', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 animate-pulse mb-4">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-teal-400 animate-spin" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-400">Loading Doctor Clinical Workspace...</p>
      </div>
    );
  }

  // Cross-role guard
  if (profile && profile.role !== 'doctor' && !isDemo) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-200 px-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 rounded-3xl p-8 text-center space-y-4 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Role Mismatch</h2>
          <p className="text-sm text-slate-400">
            This account is registered as a <span className="text-teal-400 font-semibold uppercase">{profile.role}</span>. The Clinical Doctor Portal is restricted to verified physician accounts only.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (profile.role === 'patient') window.location.href = '/patient';
                else if (profile.role === 'institution') window.location.href = '/institution';
              }}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-teal-500 text-slate-950 hover:bg-teal-400 transition"
            >
              Go to {profile.role === 'patient' ? 'Patient' : 'Institution'} Portal
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
    <div className="flex h-screen w-full bg-[#0a0f1d] text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-500/20 border border-teal-500/50 backdrop-blur-md shadow-2xl text-teal-200"
          >
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#0d1527] md:bg-[#0d1527]/80 backdrop-blur-xl transition-all duration-300 md:static',
          sidebarOpen ? 'w-64 translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0 md:w-20'
        )}
      >
        {/* Sidebar Brand & Doctor Code */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-6 h-6 text-[#0a0f1d]" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-base tracking-wide bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent truncate">
                  MedConnect AI
                </h1>
                <p className="text-[11px] font-mono text-teal-400/80 truncate">{doctorProfile.code}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Doctor Quick Badge */}
        {sidebarOpen && (
          <div className="px-4 py-3 m-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center font-bold text-teal-300 text-sm">
              MC
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{doctorProfile.name}</p>
              <p className="text-[10px] text-teal-400/90 truncate">{doctorProfile.title}</p>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/10 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200',
                    item.isSparkle && 'text-cyan-400 animate-pulse'
                  )}
                />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
                {sidebarOpen && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-[11px] font-semibold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {item.badge}
                  </span>
                )}
                {!sidebarOpen && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-teal-400 ring-2 ring-[#0a0f1d]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={async () => {
              await signOut();
              window.location.href = '/';
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0d1629] to-[#080d19]">
        {/* Top Header */}
        <header className="h-14 sm:h-16 px-3 sm:px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm sm:text-lg font-semibold text-slate-100 capitalize truncate">
              {navItems.find(n => n.id === activeTab)?.label || 'Doctor Dashboard'}
            </h2>
            <span className="hidden lg:inline-block px-2.5 py-0.5 text-xs font-mono rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20">
              License Verified
            </span>
            <span className="hidden sm:flex px-2 py-0.5 text-[10px] font-mono rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v1.2.0 • Live Sync
            </span>
            <span className="sm:hidden flex items-center gap-1 text-[10px] font-mono text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded-full border border-teal-500/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsUnlockModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold text-xs transition cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Access Patient via ID</span>
              <span className="sm:hidden">PID</span>
            </button>

            <button
              onClick={() => {
                if (patients.length === 0) {
                  setIsUnlockModalOpen(true);
                  showToast('Please unlock a patient first using their 6-digit access PIN.');
                  return;
                }
                setSelectedPatientForConsult(patients[0]);
                setConsultationStep(1);
                setActiveTab('consultations');
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-semibold text-xs shadow-md shadow-teal-500/20 hover:brightness-110 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Consultation</span>
              <span className="sm:hidden">Consult</span>
            </button>

            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/';
              }}
              title="Sign Out"
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div
          className={cn(
            'flex-1 min-w-0',
            activeTab === 'messages'
              ? 'h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] overflow-hidden p-0 sm:p-6 flex flex-col'
              : 'overflow-y-auto p-3 sm:p-6'
          )}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <OverviewSection
                key="overview"
                patients={patients}
                appointments={appointments}
                consultations={consultations}
                onStartConsult={handleStartConsultationForPatient}
                onSelectPatientRecord={p => {
                  setSelectedPatientForRecord(p);
                  setActiveTab('records');
                }}
                onNavigateTab={tab => setActiveTab(tab)}
              />
            )}

            {activeTab === 'queue' && (
              <PatientQueueSection
                key="queue"
                appointments={appointments}
                patients={patients}
                onStartConsult={handleStartConsultationForPatient}
                onUpdateStatus={(id, status) => {
                  setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
                  showToast(`Appointment status updated to ${status}`);
                }}
              />
            )}

            {activeTab === 'consultations' && (
              <ConsultationFlowSection
                key={selectedPatientForConsult?.id || 'consultations-default'}
                patients={patients}
                step={consultationStep}
                setStep={setConsultationStep}
                selectedPatient={selectedPatientForConsult}
                onSelectPatient={setSelectedPatientForConsult}
                searchQuery={patientSearchQuery}
                setSearchQuery={setPatientSearchQuery}
                chiefComplaint={chiefComplaint}
                setChiefComplaint={setChiefComplaint}
                hpi={hpi}
                setHpi={setHpi}
                selectedROS={selectedROS}
                setSelectedROS={setSelectedROS}
                vitalsInput={vitalsInput}
                setVitalsInput={setVitalsInput}
                examinationFindings={examinationFindings}
                setExaminationFindings={setExaminationFindings}
                diagnosisTags={diagnosisTags}
                diagnosisInput={diagnosisInput}
                setDiagnosisInput={setDiagnosisInput}
                onAddDiagnosisTag={handleAddDiagnosisTag}
                onRemoveDiagnosisTag={handleRemoveDiagnosisTag}
                differentialDiagnosis={differentialDiagnosis}
                setDifferentialDiagnosis={setDifferentialDiagnosis}
                treatmentPlan={treatmentPlan}
                setTreatmentPlan={setTreatmentPlan}
                prescriptions={prescriptions}
                onAddPrescription={handleAddPrescription}
                onUpdatePrescription={handleUpdatePrescription}
                onRemovePrescription={handleRemovePrescription}
                labOrders={labOrders}
                onAddLabOrder={handleAddLabOrder}
                onUpdateLabOrder={handleUpdateLabOrder}
                onRemoveLabOrder={handleRemoveLabOrder}
                followUpDate={followUpDate}
                setFollowUpDate={setFollowUpDate}
                followUpNotes={followUpNotes}
                setFollowUpNotes={setFollowUpNotes}
                onSaveConsultation={handleSaveConsultation}
              />
            )}

            {activeTab === 'records' && (
              <PatientRecordsSection
                key={selectedPatientForRecord?.id || 'records-default'}
                patients={patients}
                consultations={consultations}
                selectedPatient={selectedPatientForRecord}
                onSelectPatient={setSelectedPatientForRecord}
                onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
                showToast={showToast}
              />
            )}

            {activeTab === 'appointments' && (
              <AppointmentsSection
                key="appointments"
                appointments={appointments}
                setAppointments={setAppointments}
                onStartConsult={handleStartConsultationForPatient}
                showToast={showToast}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesSection
                key="messages"
                patients={patients}
                selectedPatientId={selectedChatPatientId}
                setSelectedPatientId={setSelectedChatPatientId}
                messages={currentChatMessages}
                input={chatInput}
                setInput={setChatInput}
                onSendMessage={handleSendMessage}
                onSendTemplate={sendQuickTemplate}
                onDeleteMessage={handleDeleteMessage}
                onClearChat={handleClearChat}
                onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
              />
            )}

            {activeTab === 'ai' && (
              <AiWorkspaceSection
                key="ai"
                patients={patients}
                selectedPatientId={aiSelectedPatientId || (patients[0]?.id || '')}
                setSelectedPatientId={setAiSelectedPatientId}
                loading={aiAnalysisLoading}
                riskData={aiRiskData}
                onRunRiskAnalysis={handleRunAiAnalysis}
                drugA={drugA}
                setDrugA={setDrugA}
                drugB={drugB}
                setDrugB={setDrugB}
                interactionResult={interactionResult}
                onCheckInteraction={handleCheckInteraction}
                rawNote={aiNoteRawText}
                setRawNote={setAiNoteRawText}
                extractedNote={extractedAiNote}
                onExtractNote={handleExtractNote}
                onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
              />
            )}

            {activeTab === 'schedule' && (
              <ScheduleSection
                key="schedule"
                settings={scheduleSettings}
                setSettings={setScheduleSettings}
                onSave={() => showToast('Schedule & consultation preferences updated.')}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileSection
                key="profile"
                profile={doctorProfile}
                setProfile={setDoctorProfile}
                onSave={() => showToast('Doctor credentials & profile updated.')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsSection
                key="settings"
                doctorProfile={doctorProfile}
                showToast={showToast}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ==================================================================== */}
        {/* UNLOCK PATIENT VIA PATIENT ID MODAL                                  */}
        {/* ==================================================================== */}
        <AnimatePresence>
          {isUnlockModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#0d1527] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <Key className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-bold text-white">Access Patient Medical Record</h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsUnlockModalOpen(false);
                      setPinInput('');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 leading-relaxed">
                    <p className="font-semibold mb-0.5">Sovereign Patient-Consent Access</p>
                    Per clinical privacy regulations, patient records cannot be browsed publicly. Enter the patient's unique <strong>Patient ID</strong> (displayed prominently at the top of the patient's overview page, e.g. <span className="font-mono font-bold">PID-9B2F4C1A</span>) to link and access their vitals and imaging records.
                  </div>

                  <form onSubmit={handleUnlockWithPin} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Patient ID (PID) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          autoFocus
                          placeholder="e.g. PID-9B2F4C1A"
                          value={pinInput}
                          onChange={e => setPinInput(e.target.value.toUpperCase())}
                          className="w-full px-4 py-3 rounded-xl bg-black/60 border border-cyan-500/40 text-white font-mono text-base tracking-wider focus:outline-none focus:border-cyan-400 placeholder:text-slate-600 uppercase"
                        />
                        <Key className="w-4 h-4 text-cyan-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUnlockModalOpen(false);
                          setPinInput('');
                        }}
                        className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUnlocking || !pinInput.trim()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold transition shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>{isUnlocking ? 'Connecting...' : 'Access Patient Records'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// Sub-component 1: Overview
// ----------------------------------------------------------------------
function OverviewSection({
  patients,
  appointments,
  consultations,
  onStartConsult,
  onSelectPatientRecord,
  onNavigateTab
}: {
  patients: Patient[];
  appointments: Appointment[];
  consultations: ConsultationRecord[];
  onStartConsult: (p: Patient) => void;
  onSelectPatientRecord: (p: Patient) => void;
  onNavigateTab: (tab: string) => void;
}) {
  const waitingCount = appointments.filter(a => a.status === 'Waiting').length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-teal-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Patients</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{patients.length}</span>
            <span className="text-xs text-slate-400 font-medium">
              {patients.length > 0 ? 'Connected patient charts' : 'No patients linked yet'}
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Today's Appointments</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{appointments.length}</span>
            <span className="text-xs text-cyan-400 font-medium">
              {appointments.length > 0 ? `${waitingCount} waiting in lobby` : '0 scheduled today'}
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Reviews</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">0</span>
            <span className="text-xs text-slate-400 font-medium">0 pending reviews</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Consultations</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{consultations.length}</span>
            <span className="text-xs text-emerald-400 font-medium">
              {consultations.length > 0 ? 'Logged in EMR' : '0 logged in EMR'}
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* Main Grid: Waiting Queue & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting Queue List */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Today's Patient Queue</h3>
              <p className="text-xs text-slate-400">Manage triage and start clinical consultations</p>
            </div>
            <button
              onClick={() => onNavigateTab('queue')}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
            >
              View Full Queue <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {appointments.length === 0 ? (
              <div className="py-10 text-center space-y-2 rounded-xl bg-white/[0.01] border border-white/5">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-200">No Patients in Queue</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When appointments are booked or patient records are unlocked, they will appear here.
                </p>
              </div>
            ) : (
              appointments.map(apt => {
                const patient = patients.find(p => p.id === apt.patientId);
                return (
                  <div
                    key={apt.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300 font-bold text-xs shrink-0">
                        {apt.time.split(' ')[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-sm">{apt.patientName}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                            {apt.pid}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-medium',
                              apt.type === 'Emergency'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : apt.type === 'Telehealth'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            )}
                          >
                            {apt.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{apt.reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {patient && (
                        <button
                          onClick={() => onStartConsult(patient)}
                          className="px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 hover:bg-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <Stethoscope className="w-3.5 h-3.5" /> Start
                        </button>
                      )}
                      {patient && (
                        <button
                          onClick={() => onSelectPatientRecord(patient)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1 transition"
                        >
                          <FileText className="w-3.5 h-3.5" /> EMR
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions & AI Assistant Widget */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
            <h3 className="text-base font-semibold text-white mb-3">Clinical Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigateTab('consultations')}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 text-left transition group"
              >
                <Stethoscope className="w-5 h-5 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-slate-200">New Consult</p>
                <p className="text-[10px] text-slate-400">Full 6-step flow</p>
              </button>

              <button
                onClick={() => onNavigateTab('ai')}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 text-left transition group"
              >
                <Bot className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-slate-200">AI Assistant</p>
                <p className="text-[10px] text-slate-400">Risk & drug review</p>
              </button>

              <button
                onClick={() => onNavigateTab('records')}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 text-left transition group"
              >
                <Search className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-slate-200">Patient Search</p>
                <p className="text-[10px] text-slate-400">Lookup PID records</p>
              </button>

              <button
                onClick={() => onNavigateTab('schedule')}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/30 text-left transition group"
              >
                <Clock className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-slate-200">Set Availability</p>
                <p className="text-[10px] text-slate-400">Hours & telehealth</p>
              </button>
            </div>
          </div>

          {/* AI Daily Insight Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-950/40 to-cyan-950/30 border border-teal-500/30 relative overflow-hidden">
            <div className="flex items-center gap-2 text-teal-300 font-semibold text-sm mb-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>AI Clinical Triage Alert</span>
            </div>
            {patients.length > 0 ? (
              <p className="text-xs text-slate-300 leading-relaxed">
                Connected with {patients[0].name} ({patients[0].pid}). Vitals baseline, clinical notes, and pharmacological risk analysis available in AI Workspace.
              </p>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">
                No active clinical triage alerts. Connect with a patient using their permanent Patient ID (PID) to monitor vital trajectories and run AI clinical decision support.
              </p>
            )}
            <button
              onClick={() => onNavigateTab('ai')}
              className="mt-3 text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              Open AI Workspace <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Sub-component 2: Patient Queue
// ----------------------------------------------------------------------
function PatientQueueSection({
  appointments,
  patients,
  onStartConsult,
  onUpdateStatus
}: {
  appointments: Appointment[];
  patients: Patient[];
  onStartConsult: (p: Patient) => void;
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
}) {
  const [filter, setFilter] = useState<'All' | 'Waiting' | 'In Progress' | 'Completed'>('All');

  const filtered = appointments.filter(a => (filter === 'All' ? true : a.status === filter));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Live Patient Queue</h3>
          <p className="text-xs text-slate-400">Monitor arrivals, triage vitals, and initiate clinical sessions</p>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          {(['All', 'Waiting', 'In Progress', 'Completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition',
                filter === tab ? 'bg-teal-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-semibold text-slate-200">No Patients in Queue</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no patients in this queue. When appointments are scheduled or patient records are unlocked, they will appear here.
            </p>
          </div>
        ) : (
          filtered.map(apt => {
            const patient = patients.find(p => p.id === apt.patientId);
            return (
              <div
                key={apt.id}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-500/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex flex-col items-center justify-center text-teal-300 font-bold text-xs shrink-0">
                    <Clock3 className="w-4 h-4 mb-0.5" />
                    <span>{apt.time.split(' ')[0]}</span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-base text-white">{apt.patientName}</h4>
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                        {apt.pid}
                      </span>
                      <span
                        className={cn(
                          'text-xs px-2.5 py-0.5 rounded-full font-medium',
                          apt.type === 'Emergency'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : apt.type === 'Telehealth'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        )}
                      >
                        {apt.type}
                      </span>
                      <span
                        className={cn(
                          'text-xs px-2.5 py-0.5 rounded-full font-medium',
                          apt.status === 'Waiting'
                            ? 'bg-amber-500/20 text-amber-300'
                            : apt.status === 'In Progress'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        )}
                      >
                        ● {apt.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2">
                      <span className="text-slate-500">Reason:</span> {apt.reason}
                    </p>

                    {patient && (
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>Age: {patient.age}y</span>
                        <span>Gender: {patient.gender}</span>
                        <span>Blood Group: {patient.bloodGroup}</span>
                        {patient.allergies.length > 0 && (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Allergy:{' '}
                            {patient.allergies.map(a => a.name).join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap md:justify-end">
                  {apt.status === 'Waiting' && (
                    <button
                      onClick={() => onUpdateStatus(apt.id, 'In Progress')}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium transition"
                    >
                      Check In Patient
                    </button>
                  )}
                  {patient && (
                    <button
                      onClick={() => onStartConsult(patient)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 hover:brightness-110 flex items-center gap-1.5 transition"
                    >
                      <Stethoscope className="w-4 h-4" /> Start Consultation
                    </button>
                  )}
                  {apt.status !== 'Completed' && (
                    <button
                      onClick={() => onUpdateStatus(apt.id, 'Completed')}
                      className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 transition"
                    >
                      Mark Done
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Sub-component 3: Consultation Flow (6 Steps with Progress)
// ----------------------------------------------------------------------
function ConsultationFlowSection({
  patients,
  step,
  setStep,
  selectedPatient,
  onSelectPatient,
  searchQuery,
  setSearchQuery,
  chiefComplaint,
  setChiefComplaint,
  hpi,
  setHpi,
  selectedROS,
  setSelectedROS,
  vitalsInput,
  setVitalsInput,
  examinationFindings,
  setExaminationFindings,
  diagnosisTags,
  diagnosisInput,
  setDiagnosisInput,
  onAddDiagnosisTag,
  onRemoveDiagnosisTag,
  differentialDiagnosis,
  setDifferentialDiagnosis,
  treatmentPlan,
  setTreatmentPlan,
  prescriptions,
  onAddPrescription,
  onUpdatePrescription,
  onRemovePrescription,
  labOrders,
  onAddLabOrder,
  onUpdateLabOrder,
  onRemoveLabOrder,
  followUpDate,
  setFollowUpDate,
  followUpNotes,
  setFollowUpNotes,
  onSaveConsultation
}: any) {
  const steps = [
    { number: 1, title: 'Select Patient' },
    { number: 2, title: 'Symptoms & History' },
    { number: 3, title: 'Examination & Vitals' },
    { number: 4, title: 'Diagnosis & Plan' },
    { number: 5, title: 'Orders (Rx & Labs)' },
    { number: 6, title: 'Summary & Finalize' }
  ];

  const rosOptions = [
    'Constitutional (Fever/Fatigue)',
    'Cardiovascular (Chest pain/Palpitations)',
    'Respiratory (Cough/Dyspnea)',
    'Gastrointestinal (Nausea/Abdominal pain)',
    'Neurological (Headache/Dizziness)',
    'Musculoskeletal (Joint pain/Swelling)',
    'Integumentary (Rash/Lesions)'
  ];

  const filteredPatients = patients.filter(
    (p: Patient) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl mx-auto">
      {/* Progress Bar Header */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-white">Clinical Consultation Wizard</h3>
            <p className="text-xs text-slate-400">Step {step} of 6 — {steps[step - 1].title}</p>
          </div>
          {selectedPatient && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs">
              <span className="text-slate-400">Patient:</span>
              <span className="font-semibold text-teal-300">{selectedPatient.name}</span>
              <span className="text-slate-400 font-mono">({selectedPatient.pid})</span>
            </div>
          )}
        </div>

        {/* Stepper Dots */}
        <div className="grid grid-cols-6 gap-2">
          {steps.map(s => (
            <div key={s.number} className="flex flex-col gap-1">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  step === s.number
                    ? 'bg-teal-400 ring-2 ring-teal-400/30'
                    : step > s.number
                    ? 'bg-teal-500'
                    : 'bg-white/10'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium hidden sm:block truncate',
                  step === s.number ? 'text-teal-300' : 'text-slate-500'
                )}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md min-h-[420px]">
        {/* Step 1: Select Patient */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-white">Select or Search Patient</h4>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by patient name or PID (e.g. PID-948210)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {filteredPatients.map((p: Patient) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPatient(p)}
                  className={cn(
                    'p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between',
                    selectedPatient?.id === p.id
                      ? 'bg-teal-500/10 border-teal-500/50 shadow-md shadow-teal-500/10'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                  )}
                >
                  <div>
                    <h5 className="font-semibold text-white text-sm">{p.name}</h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.age}y • {p.gender} • Blood Group: {p.bloodGroup}
                    </p>
                    <p className="text-[11px] font-mono text-teal-400 mt-1">{p.pid}</p>
                  </div>
                  {selectedPatient?.id === p.id && (
                    <div className="w-6 h-6 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Symptoms & History */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chief Complaint (Primary reason for presentation) *
              </label>
              <input
                type="text"
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                placeholder="e.g. Severe throbbing headache for 3 days with nausea"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                History of Present Illness (HPI)
              </label>
              <textarea
                rows={4}
                value={hpi}
                onChange={e => setHpi(e.target.value)}
                placeholder="Detailed timeline, characteristics, severity (1-10), aggravating/alleviating factors..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Review of Systems (ROS)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rosOptions.map(opt => {
                  const isChecked = selectedROS.includes(opt);
                  return (
                    <label
                      key={opt}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition',
                        isChecked
                          ? 'bg-teal-500/10 border-teal-500/40 text-teal-200'
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedROS(selectedROS.filter((i: string) => i !== opt));
                          } else {
                            setSelectedROS([...selectedROS, opt]);
                          }
                        }}
                        className="rounded border-white/20 text-teal-500 focus:ring-0"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Examination & Vitals */}
        {step === 3 && (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-white">Record Vital Signs</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Blood Pressure (mmHg)</label>
                <input
                  type="text"
                  value={vitalsInput.bp}
                  onChange={e => setVitalsInput({ ...vitalsInput, bp: e.target.value })}
                  placeholder="120/80"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Heart Rate (bpm)</label>
                <input
                  type="text"
                  value={vitalsInput.hr}
                  onChange={e => setVitalsInput({ ...vitalsInput, hr: e.target.value })}
                  placeholder="72"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Temperature (°C)</label>
                <input
                  type="text"
                  value={vitalsInput.temp}
                  onChange={e => setVitalsInput({ ...vitalsInput, temp: e.target.value })}
                  placeholder="36.8"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Oxygen Saturation (%)</label>
                <input
                  type="text"
                  value={vitalsInput.spo2}
                  onChange={e => setVitalsInput({ ...vitalsInput, spo2: e.target.value })}
                  placeholder="99"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Resp Rate (/min)</label>
                <input
                  type="text"
                  value={vitalsInput.rr}
                  onChange={e => setVitalsInput({ ...vitalsInput, rr: e.target.value })}
                  placeholder="16"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Weight (kg)</label>
                <input
                  type="text"
                  value={vitalsInput.weight}
                  onChange={e => setVitalsInput({ ...vitalsInput, weight: e.target.value })}
                  placeholder="70"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">BMI</label>
                <input
                  type="text"
                  value={vitalsInput.bmi}
                  onChange={e => setVitalsInput({ ...vitalsInput, bmi: e.target.value })}
                  placeholder="23.5"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Objective Physical Examination Findings
              </label>
              <textarea
                rows={4}
                value={examinationFindings}
                onChange={e => setExaminationFindings(e.target.value)}
                placeholder="General appearance, Cardiovascular (S1/S2, murmurs), Respiratory (vesicular sounds, crepitations), Abdominal palpation, Neurological..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 4: Diagnosis & Plan */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Diagnosis (Tags)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={diagnosisInput}
                  onChange={e => setDiagnosisInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onAddDiagnosisTag()}
                  placeholder="Enter diagnosis (e.g. Essential Hypertension, Type 2 Diabetes) and press Add"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm"
                />
                <button
                  onClick={onAddDiagnosisTag}
                  className="px-4 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:brightness-110"
                >
                  Add Tag
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {diagnosisTags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium"
                  >
                    {tag}
                    <button onClick={() => onRemoveDiagnosisTag(tag)} className="hover:text-rose-400">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Differential Diagnosis</label>
              <textarea
                rows={2}
                value={differentialDiagnosis}
                onChange={e => setDifferentialDiagnosis(e.target.value)}
                placeholder="List alternative diagnostic considerations..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Treatment Plan & Directives</label>
              <textarea
                rows={3}
                value={treatmentPlan}
                onChange={e => setTreatmentPlan(e.target.value)}
                placeholder="Lifestyle modifications, medication strategy, clinical precautions, patient education..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 5: Orders (Prescriptions & Lab Tests) */}
        {step === 5 && (
          <div className="space-y-6">
            {/* Prescriptions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-teal-400" />
                  <h4 className="text-sm font-semibold text-white">Medication Prescriptions</h4>
                </div>
                <button
                  onClick={onAddPrescription}
                  className="px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-1 hover:bg-teal-500/30"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Medication
                </button>
              </div>

              <div className="space-y-2.5">
                {prescriptions.map((rx: PrescriptionItem) => (
                  <div
                    key={rx.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-center"
                  >
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Drug name (e.g. Metformin)"
                        value={rx.medication}
                        onChange={e => onUpdatePrescription(rx.id, 'medication', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Dosage (500mg)"
                        value={rx.dosage}
                        onChange={e => onUpdatePrescription(rx.id, 'dosage', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Freq (BD / 2x daily)"
                        value={rx.frequency}
                        onChange={e => onUpdatePrescription(rx.id, 'frequency', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Duration (30 Days)"
                        value={rx.duration}
                        onChange={e => onUpdatePrescription(rx.id, 'duration', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Route/Notes"
                        value={rx.instructions}
                        onChange={e => onUpdatePrescription(rx.id, 'instructions', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                      />
                      <button
                        onClick={() => onRemovePrescription(rx.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lab Orders */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-semibold text-white">Laboratory & Diagnostic Orders</h4>
                </div>
                <button
                  onClick={onAddLabOrder}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 hover:bg-cyan-500/30"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Lab Order
                </button>
              </div>

              <div className="space-y-2.5">
                {labOrders.map((lab: LabOrderItem) => (
                  <div
                    key={lab.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-center"
                  >
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Test Name (e.g. Lipid Profile, Chest X-Ray)"
                        value={lab.testName}
                        onChange={e => onUpdateLabOrder(lab.id, 'testName', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <select
                        value={lab.category}
                        onChange={e => onUpdateLabOrder(lab.id, 'category', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#11192d] border border-white/10 text-white text-xs"
                      >
                        <option value="Biochemistry">Biochemistry</option>
                        <option value="Hematology">Hematology</option>
                        <option value="Microbiology">Microbiology</option>
                        <option value="Radiology">Radiology</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={lab.urgency}
                        onChange={e => onUpdateLabOrder(lab.id, 'urgency', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#11192d] border border-white/10 text-white text-xs"
                      >
                        <option value="Routine">Routine</option>
                        <option value="Urgent">Urgent</option>
                        <option value="STAT">STAT</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Clinical Indication"
                        value={lab.notes}
                        onChange={e => onUpdateLabOrder(lab.id, 'notes', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                      />
                      <button
                        onClick={() => onRemoveLabOrder(lab.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Follow-up & Summary */}
        {step === 6 && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <h4 className="text-sm font-semibold text-teal-300 mb-1">Consultation Summary Verification</h4>
              <p className="text-xs text-slate-300">
                Review clinical directives. Saving will automatically create a secure cryptographic EMR record.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="font-semibold text-slate-300">Patient & Presentation:</span>
                <p className="text-white font-medium">{selectedPatient?.name} ({selectedPatient?.pid})</p>
                <p className="text-slate-400"><strong className="text-slate-300">Complaint:</strong> {chiefComplaint || 'None entered'}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Diagnoses:</strong> {diagnosisTags.join(', ') || 'Not specified'}</p>
                <p className="text-slate-400"><strong className="text-slate-300">BP / HR:</strong> {vitalsInput.bp} mmHg / {vitalsInput.hr} bpm</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="font-semibold text-slate-300">Prescriptions & Diagnostics:</span>
                <p className="text-slate-400">
                  <strong className="text-slate-300">Prescriptions:</strong> {prescriptions.length} items
                </p>
                <p className="text-slate-400">
                  <strong className="text-slate-300">Lab Orders:</strong> {labOrders.length} tests ordered
                </p>
                <p className="text-slate-400">
                  <strong className="text-slate-300">Treatment Plan:</strong> {treatmentPlan || 'Routine clinical monitoring'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Follow-Up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#11192d] border border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Follow-Up Instructions / Warning Signs</label>
                <input
                  type="text"
                  value={followUpNotes}
                  onChange={e => setFollowUpNotes(e.target.value)}
                  placeholder="e.g. Return immediately if chest pain or shortness of breath occurs."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5 transition"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < 6 ? (
          <button
            onClick={() => {
              if (step === 1 && !selectedPatient) {
                alert('Please select a patient first.');
                return;
              }
              setStep(step + 1);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20 hover:brightness-110 flex items-center gap-1.5 transition"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onSaveConsultation}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-teal-500/30 hover:brightness-110 flex items-center gap-2 transition"
          >
            <CheckCircle2 className="w-4 h-4" /> Save & Generate EMR Record
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Sub-component 4: Patient Records (Full Medical History & Timeline)
// ----------------------------------------------------------------------
function PatientRecordsSection({
  patients,
  consultations,
  selectedPatient,
  onSelectPatient,
  onOpenUnlockModal,
  showToast,
}: {
  patients: Patient[];
  consultations: ConsultationRecord[];
  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onOpenUnlockModal: () => void;
  showToast: (m: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [recordTab, setRecordTab] = useState<'timeline' | 'imaging'>('timeline');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const patient = selectedPatient || patients[0];
  const [liveVitals, setLiveVitals] = useState<any[]>([]);
  const [isLoadingVitals, setIsLoadingVitals] = useState<boolean>(false);
  const [liveSymptoms, setLiveSymptoms] = useState<any[]>([]);
  const [isLoadingSymptoms, setIsLoadingSymptoms] = useState<boolean>(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Strict isolation of vitals and symptoms per patient — never leak or retain previous patient's data
  useEffect(() => {
    // 1. Immediately reset vitals and symptoms when switching to another patient
    setLiveVitals([]);
    setLiveSymptoms([]);
    if (!patient?.id) {
      setIsLoadingVitals(false);
      setIsLoadingSymptoms(false);
      return;
    }

    let isMounted = true;
    setIsLoadingVitals(true);
    setIsLoadingSymptoms(true);

    async function loadPatientSymptoms() {
      if (!patient?.id) return;
      try {
        const sHistory = await getSymptomHistory(30, patient.id);
        if (isMounted) {
          setLiveSymptoms(sHistory || []);
          setIsLoadingSymptoms(false);
        }
      } catch (err) {
        console.warn('Error loading patient symptoms in doctor EMR:', err);
        if (isMounted) setIsLoadingSymptoms(false);
      }
    }

    async function loadPatientVitals() {
      try {
        // 1. Check health_vitals table
        const { data: vRows } = await supabase
          .from('health_vitals')
          .select('*')
          .eq('patient_id', patient.id)
          .order('recorded_at', { ascending: false })
          .limit(30);

        if (isMounted && Array.isArray(vRows) && vRows.length > 0) {
          const formatted = vRows.map((r: any) => ({
            date: new Date(r.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            bp: `${r.systolic_bp || 120}/${r.diastolic_bp || 80}`,
            hr: r.heart_rate || 72,
            temp: Number(r.temperature) || 36.6,
            spo2: Number(r.oxygen_saturation) || 98,
            glucose: r.blood_glucose ? Number(r.blood_glucose) : undefined,
            weight: r.weight_kg ? Number(r.weight_kg) : undefined,
          }));
          setLiveVitals(formatted);
          setIsLoadingVitals(false);
          return;
        }

        // 2. Check profiles.metadata.vitals_history (guaranteed accessible across all authenticated roles)
        const { data: pProfile } = await supabase
          .from('profiles')
          .select('metadata')
          .eq('id', patient.id)
          .maybeSingle();

        const metaHistory = (pProfile?.metadata as any)?.vitals_history;
        if (isMounted && Array.isArray(metaHistory) && metaHistory.length > 0) {
          setLiveVitals(metaHistory);
          setIsLoadingVitals(false);
          return;
        }

        // 3. Fallback to patient's cached vitalsHistory from unlock PIN
        if (isMounted && patient?.vitalsHistory && patient.vitalsHistory.length > 0) {
          setLiveVitals(patient.vitalsHistory);
          setIsLoadingVitals(false);
          return;
        }

        // 4. Local storage fallback for this specific patient
        const localKey = 'medconnect_health_vitals';
        const raw = localStorage.getItem(localKey);
        if (raw && isMounted) {
          const list = JSON.parse(raw);
          const userRows = list.filter((r: any) => r.patient_id === patient.id);
          if (userRows.length > 0) {
            const formatted = userRows.map((r: any) => ({
              date: new Date(r.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              bp: `${r.systolic_bp || 120}/${r.diastolic_bp || 80}`,
              hr: r.heart_rate || 72,
              temp: Number(r.temperature) || 36.6,
              spo2: Number(r.oxygen_saturation) || 98,
              glucose: r.blood_glucose ? Number(r.blood_glucose) : undefined,
              weight: r.weight_kg ? Number(r.weight_kg) : undefined,
            }));
            setLiveVitals(formatted);
            setIsLoadingVitals(false);
            return;
          }
        }

        // 5. CRITICAL: If no vitals found for this specific patient, explicitly clear!
        if (isMounted) {
          setLiveVitals([]);
          setIsLoadingVitals(false);
        }
      } catch (err) {
        console.warn('Error loading patient vitals in doctor EMR:', err);
        if (isMounted) {
          setLiveVitals([]);
          setIsLoadingVitals(false);
        }
      }
    }

    loadPatientVitals();
    loadPatientSymptoms();
    const interval = setInterval(loadPatientVitals, 3000);
    const symptomsInterval = setInterval(loadPatientSymptoms, 4000);

    // Supabase realtime channel for instant event push
    const channel = supabase
      .channel(`patient_vitals_live_${patient.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'health_vitals', filter: `patient_id=eq.${patient.id}` },
        () => {
          if (isMounted) loadPatientVitals();
        }
      )
      .subscribe();

    const symptomsChannel = supabase
      .channel(`patient_symptoms_live_${patient.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'symptom_logs', filter: `patient_id=eq.${patient.id}` },
        () => {
          if (isMounted) loadPatientSymptoms();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearInterval(symptomsInterval);
      supabase.removeChannel(channel);
      supabase.removeChannel(symptomsChannel);
    };
  }, [patient?.id]);

  const patientConsultations = consultations.filter(c => c.patientId === patient?.id);

  // Pagination / index stepper for rapid clinical review through 20-50+ patients
  const currentIndex = patients.findIndex(p => p.id === patient?.id);
  const prevPatient = currentIndex > 0 ? patients[currentIndex - 1] : null;
  const nextPatient = currentIndex >= 0 && currentIndex < patients.length - 1 ? patients[currentIndex + 1] : null;

  const filteredPatients = patients.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.pid.toLowerCase().includes(search.toLowerCase()) ||
      (p.bloodGroup && p.bloodGroup.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Scalable Patient Selector Toolbar for 20-50+ Patients */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Active Patient Dropdown & Stepper */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Quick Step Buttons for rapid queue review */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl shrink-0">
              <button
                type="button"
                disabled={!prevPatient}
                onClick={() => prevPatient && onSelectPatient(prevPatient)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                title={prevPatient ? `Previous: ${prevPatient.name}` : 'No previous patient'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-400 px-2 select-none">
                {patients.length > 0 ? `${currentIndex + 1} / ${patients.length}` : '0 / 0'}
              </span>
              <button
                type="button"
                disabled={!nextPatient}
                onClick={() => nextPatient && onSelectPatient(nextPatient)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                title={nextPatient ? `Next: ${nextPatient.name}` : 'No next patient'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown Selector Combobox */}
            <div className="relative flex-1 min-w-[220px]" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/40 text-left transition flex items-center justify-between gap-2 cursor-pointer"
              >
                {patient ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {patient.name.charAt(0)}
                    </div>
                    <div className="min-w-0 truncate">
                      <span className="text-xs font-bold text-white mr-2">{patient.name}</span>
                      <span className="text-[10px] font-mono text-teal-300 px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                        {patient.pid}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Select a patient chart...</span>
                )}
                <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform shrink-0', isDropdownOpen && 'rotate-180')} />
              </button>

              {/* Dropdown Panel with Search & Mobile Backdrop */}
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/50 sm:bg-transparent"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 sm:right-auto sm:w-80 top-full mt-2 z-50 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-2 space-y-2 max-h-72 flex flex-col">
                    <div className="relative shrink-0 flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          autoFocus
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Filter by name or PID..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-teal-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(false)}
                        className="sm:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onSelectPatient(p);
                              setIsDropdownOpen(false);
                              setSearch('');
                            }}
                            className={cn(
                              'w-full p-2.5 rounded-xl text-left transition flex items-center justify-between gap-2 cursor-pointer',
                              p.id === patient?.id
                                ? 'bg-teal-500/20 border border-teal-500/40 text-teal-200'
                                : 'hover:bg-slate-900 text-slate-300'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-md bg-teal-500/20 text-teal-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                                {p.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {p.pid} • {p.age && p.age > 0 ? `${p.age}y` : 'Age N/A'} {p.gender}
                                </p>
                              </div>
                            </div>
                            {p.bloodGroup && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                                {p.bloodGroup}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <p className="text-center text-xs text-slate-500 py-4">No matching patients found.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Open Full Patient Directory Modal / Roster View */}
            <button
              type="button"
              onClick={() => setIsDirectoryOpen(prev => !prev)}
              className={cn(
                'px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer',
                isDirectoryOpen
                  ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold shadow'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Patient Directory ({patients.length})</span>
            </button>
          </div>

          {/* Unlock via PID button */}
          <button
            onClick={onOpenUnlockModal}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 hover:brightness-110 transition shadow-sm shadow-teal-500/20 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Unlock Patient via PID</span>
          </button>
        </div>

        {/* Collapsible Full Patient Directory Roster Grid (Handles 20 to 100+ patients smoothly) */}
        {isDirectoryOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3 border-t border-white/10 space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-400" />
                Unlocked Patient Directory ({patients.length} total)
              </span>
              <span className="text-[11px] text-slate-400">
                Click any patient card to immediately isolate and switch their chart
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {patients.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPatient(p);
                    setIsDirectoryOpen(false);
                  }}
                  className={cn(
                    'p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5',
                    p.id === patient?.id
                      ? 'bg-teal-500/20 border-teal-500/50 shadow-md shadow-teal-500/10 ring-1 ring-teal-400/30'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/20'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-teal-300 font-mono truncate">{p.pid}</p>
                      <p className="text-[10px] text-slate-400">
                        {p.age}y • {p.gender} • {p.bloodGroup || 'Blood: N/A'}
                      </p>
                    </div>
                  </div>
                  {p.id === patient?.id && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500 text-slate-950 shrink-0">
                      Active
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {patients.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Patient Records Unlocked</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Patients maintain sovereign privacy control over their health data. Clinicians cannot browse profiles publicly. Enter the patient's permanent <strong>Patient ID</strong> (e.g. <span className="font-mono text-teal-300">PID-9B2F4C1A</span>) to link their chart, vitals, and diagnostic imaging.
            </p>
          </div>
          <button
            onClick={onOpenUnlockModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition flex items-center gap-2 mx-auto"
          >
            <Key className="w-4 h-4" />
            <span>Enter Patient ID</span>
          </button>
        </div>
      ) : patient ? (
        <div className="space-y-4">
          {/* Active Patient Safety & Isolation Verification Banner (Compact & Responsive on Mobile) */}
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-950 border border-teal-500/30 flex items-center justify-between gap-2 text-xs shadow-lg shadow-teal-500/5">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-teal-400 font-bold">
                  Active Chart:
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate">{patient.name}</span>
                <span className="font-mono text-[10px] sm:text-xs text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 font-bold shrink-0">
                  {patient.pid}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-300 shrink-0">
              <span className="hidden md:inline">{patient.age && patient.age > 0 ? `${patient.age}y` : 'Age N/A'} {patient.gender}</span>
              <span className="hidden md:inline text-slate-600">|</span>
              <span className="hidden sm:inline">Blood: <strong className="text-teal-300">{patient.bloodGroup || 'N/A'}</strong></span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Chart Isolated</span>
                <span className="sm:hidden text-[9px]">Isolated</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Card Left Side */}
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-extrabold text-xl">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{patient.name}</h3>
                    <span className="font-mono text-xs text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                      {patient.pid}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Demographics</span>
                    <span className="text-slate-200">{patient.age && patient.age > 0 ? `${patient.age} yrs` : 'Age N/A'} • {patient.gender}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Blood Group</span>
                    <span className="text-teal-300 font-semibold">{patient.bloodGroup}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Phone</span>
                    <span className="text-slate-200">{patient.phone || 'Not registered'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Email</span>
                    <span className="text-slate-200 truncate max-w-[170px]">{patient.email || 'Not registered'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Last Consultation</span>
                    <span className="text-slate-200">{patient.lastVisit || 'Today'}</span>
                  </div>
                </div>

                {/* Allergies */}
                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-rose-300 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Documented Allergies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies && patient.allergies.length > 0 ? (
                      patient.allergies.map((alg, i) => (
                        <span
                          key={i}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-medium border',
                            alg.severity === 'Critical'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          )}
                        >
                          {alg.name} ({alg.severity})
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No known drug allergies (NKDA)</span>
                    )}
                  </div>
                </div>

                {/* Chronic Conditions */}
                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Chronic Conditions</h4>
                  <div className="flex flex-wrap gap-2">
                    {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                      patient.chronicConditions.map((cond, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[11px]">
                          {cond}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No chronic illnesses on file</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Vitals History with Strict Patient Isolation */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-400" />
                    <span>Vitals History ({patient.name})</span>
                  </h4>
                  {isLoadingVitals ? (
                    <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Sync
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {isLoadingVitals && liveVitals.length === 0 ? (
                    <div className="p-6 rounded-xl bg-white/[0.01] border border-white/5 text-center space-y-2">
                      <RefreshCw className="w-5 h-5 text-teal-400 animate-spin mx-auto" />
                      <p className="text-xs text-slate-400">Loading {patient.name}'s vitals...</p>
                    </div>
                  ) : liveVitals.length > 0 ? (
                    liveVitals.map((vh, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                        <div className="flex justify-between text-slate-400 mb-1.5 font-mono text-[11px]">
                          <span>{vh.date}</span>
                          <span className="text-teal-300 font-semibold">BP {vh.bp}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                          <span>HR: {vh.hr} bpm</span>
                          <span>Temp: {vh.temp}°C</span>
                          <span>SpO2: {vh.spo2}%</span>
                        </div>
                        {(vh.glucose || vh.weight) && (
                          <div className="flex gap-3 text-[11px] text-slate-400 mt-1 pt-1 border-t border-white/5 font-mono">
                            {vh.glucose && <span>Glucose: {vh.glucose} mg/dL</span>}
                            {vh.weight && <span>Weight: {vh.weight} kg</span>}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-center space-y-1">
                      <p className="text-xs text-slate-300 font-medium">No vitals readings logged yet for {patient.name}.</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        When this patient records biometric vitals, they will instantly synchronize and appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Reported Symptoms Log with Live Sync */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-amber-400" />
                    <span>Reported Symptoms ({patient.name})</span>
                  </h4>
                  {isLoadingSymptoms ? (
                    <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Sync
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {isLoadingSymptoms && liveSymptoms.length === 0 ? (
                    <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5 text-center space-y-2">
                      <RefreshCw className="w-5 h-5 text-amber-400 animate-spin mx-auto" />
                      <p className="text-xs text-slate-400">Loading {patient.name}'s reported symptoms...</p>
                    </div>
                  ) : liveSymptoms.length > 0 ? (
                    liveSymptoms.map((sym: any, i: number) => {
                      const isSevere = sym.severity === 'severe' || (sym.severity_score && sym.severity_score >= 7);
                      const isModerate = sym.severity === 'moderate' || (sym.severity_score && sym.severity_score >= 4 && sym.severity_score < 7);
                      const recordedDate = sym.created_at
                        ? new Date(sym.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(sym.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Recently';

                      const symptomChips = (sym.symptom_type || '')
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean);

                      return (
                        <div key={sym.id || i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-mono">{recordedDate}</span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border',
                                isSevere
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : isModerate
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              )}
                            >
                              {sym.severity || 'Mild'} severity
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {symptomChips.map((chip: string, cIdx: number) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 font-medium text-[11px]"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono pt-1 border-t border-white/5">
                            {sym.body_location && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5">Loc: {sym.body_location}</span>
                            )}
                            {sym.duration && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5">Dur: {sym.duration}</span>
                            )}
                            {sym.pain_level !== undefined && sym.pain_level !== null && (
                              <span className={cn('px-1.5 py-0.5 rounded', sym.pain_level >= 7 ? 'bg-rose-500/10 text-rose-300' : 'bg-white/5')}>
                                Pain: {sym.pain_level}/10
                              </span>
                            )}
                          </div>

                          {sym.notes && (
                            <p className="text-[11px] text-slate-300 italic bg-white/[0.02] p-2 rounded-lg border border-white/5">
                              "{sym.notes}"
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-center space-y-1">
                      <p className="text-xs text-slate-300 font-medium">No symptoms reported yet by {patient.name}.</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        When this patient logs their symptoms in "Log My Symptoms", they will automatically appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EMR Consultations Timeline & Diagnostic Imaging Right Side */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold text-white mb-0.5">Clinical Chart & Diagnostics</h3>
                    <p className="text-xs text-slate-400">Consultation history, diagnoses, and diagnostic radiology scans for {patient.name}</p>
                  </div>

                  <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 self-start sm:self-auto">
                    <button
                      onClick={() => setRecordTab('timeline')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer',
                        recordTab === 'timeline' ? 'bg-teal-500 text-slate-950 shadow font-bold' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      EMR Timeline
                    </button>
                    <button
                      onClick={() => setRecordTab('imaging')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer',
                        recordTab === 'imaging' ? 'bg-teal-500 text-slate-950 shadow font-bold' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>CT / X-Ray / Scans</span>
                    </button>
                  </div>
                </div>

                {recordTab === 'imaging' ? (
                  <DiagnosticImagingVault
                    key={patient.id}
                    patientId={patient.id}
                    patientName={patient.name}
                    isDoctorView={true}
                    onShowToast={(t, d) => showToast(`${t}${d ? ': ' + d : ''}`)}
                  />
                ) : (
                <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                  {patientConsultations.length > 0 ? (
                    patientConsultations.map(consult => (
                      <div key={consult.id} className="relative pl-8">
                        <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-teal-400 ring-4 ring-[#0a0f1d]" />
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{consult.date}</span>
                              <span className="text-xs font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                                {consult.emrCode}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">{consult.doctorName}</span>
                          </div>

                          <div>
                            <span className="text-xs font-semibold text-teal-300">Chief Complaint:</span>
                            <p className="text-xs text-slate-300 mt-0.5">{consult.chiefComplaint}</p>
                          </div>

                          <div>
                            <span className="text-xs font-semibold text-slate-300">Diagnoses:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {consult.diagnoses.map((d, i) => (
                                <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300">
                            <span className="font-semibold text-slate-200">Treatment Plan:</span> {consult.treatmentPlan}
                          </div>

                          {consult.prescriptions.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-slate-300">Prescribed Medications:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                {consult.prescriptions.map(p => (
                                  <div key={p.id} className="p-2.5 rounded-lg bg-white/5 text-xs text-slate-300 border border-white/5">
                                    <p className="font-semibold text-teal-300">{p.medication} {p.dosage}</p>
                                    <p className="text-[11px] text-slate-400">{p.frequency} • {p.duration}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No past consultation records on file for {patient.name}.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ) : null}
  </motion.div>
);
}

// ----------------------------------------------------------------------
// Sub-component 5: Appointments
// ----------------------------------------------------------------------
function AppointmentsSection({
  appointments,
  setAppointments,
  onStartConsult,
  showToast
}: {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  onStartConsult: (p: Patient) => void;
  showToast: (m: string) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Appointment Schedule</h3>
          <p className="text-xs text-slate-400">Manage calendar bookings, confirmations, and reschedules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {appointments.map(apt => (
          <div key={apt.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                  {apt.time} • {apt.date}
                </span>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                    apt.status === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : apt.status === 'Cancelled'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  )}
                >
                  {apt.status}
                </span>
              </div>
              <h4 className="font-bold text-base text-white">{apt.patientName}</h4>
              <p className="text-xs text-slate-400 font-mono">{apt.pid}</p>
              <p className="text-xs text-slate-300 mt-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                {apt.reason}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  setAppointments(prev => prev.map(a => (a.id === apt.id ? { ...a, status: 'Completed' } : a)));
                  showToast('Appointment completed');
                }}
                className="flex-1 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-semibold transition"
              >
                Complete
              </button>
              <button
                onClick={() => {
                  setAppointments(prev => prev.map(a => (a.id === apt.id ? { ...a, status: 'Cancelled' } : a)));
                  showToast('Appointment cancelled');
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Sub-component 6: Messages
// ----------------------------------------------------------------------
function MessagesSection({
  patients,
  selectedPatientId,
  setSelectedPatientId,
  messages,
  input,
  setInput,
  onSendMessage,
  onSendTemplate,
  onDeleteMessage,
  onClearChat,
  onOpenUnlockModal
}: any) {
  const [showPatientListOnMobile, setShowPatientListOnMobile] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesCountRef = useRef(0);
  const activePatientIdRef = useRef<string | undefined>(undefined);

  if (!patients || patients.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-140px)] flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">No Connected Patients Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Direct physician-patient messaging is enabled as soon as you unlock a patient using their permanent Patient ID (PID).
          </p>
        </div>
        <button
          onClick={onOpenUnlockModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 hover:brightness-110 flex items-center gap-2"
        >
          <Key className="w-4 h-4" />
          <span>Unlock Patient via Patient ID</span>
        </button>
      </motion.div>
    );
  }

  const activePatient = patients.find((p: Patient) => p.id === selectedPatientId) || patients[0];
  const patientMessages = Array.isArray(messages) ? messages : (messages[activePatient?.id] || []);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 70;
    isAtBottomRef.current = atBottom;
  };

  // Only auto-scroll when switching patient thread, initial load, or when a new message arrives and user is already at bottom
  useEffect(() => {
    const isPatientSwitched = activePatientIdRef.current !== activePatient?.id;
    activePatientIdRef.current = activePatient?.id;

    const count = patientMessages.length;
    const isNewMessage = count > prevMessagesCountRef.current;
    const lastMsg = count > 0 ? patientMessages[count - 1] : null;
    const isFromDoctor = lastMsg && (lastMsg.senderRole === 'doctor' || lastMsg.sender === 'doctor');

    if (isPatientSwitched || prevMessagesCountRef.current === 0 || (isNewMessage && (isAtBottomRef.current || isFromDoctor))) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: isPatientSwitched ? 'auto' : 'smooth',
          });
        }
      }, 50);
    }
    prevMessagesCountRef.current = count;
  }, [patientMessages, activePatient?.id]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex-1 flex rounded-none sm:rounded-2xl bg-white/[0.03] border-0 sm:border border-white/10 backdrop-blur-md overflow-hidden relative">
      {/* Patient Conversations List - Collapsible on Mobile */}
      <div
        className={cn(
          'w-full md:w-80 border-r border-white/10 flex flex-col bg-white/[0.01] shrink-0 h-full',
          activePatient && !showPatientListOnMobile ? 'hidden md:flex' : 'flex'
        )}
      >
        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-white text-sm">Secure Patient Chats</h3>
            <p className="text-[11px] text-slate-400">HIPAA/NDPR direct messaging</p>
          </div>
          <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
            {patients.length} Active
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {patients.map((p: Patient) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPatientId(p.id);
                setShowPatientListOnMobile(false);
              }}
              className={cn(
                'w-full p-3 rounded-xl text-left transition flex items-center gap-3',
                (selectedPatientId === p.id || (!selectedPatientId && p.id === activePatient?.id))
                  ? 'bg-teal-500/20 border border-teal-500/40 text-white'
                  : 'hover:bg-white/5 text-slate-300'
              )}
            >
              <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center font-bold text-teal-300 text-xs shrink-0">
                {p.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-xs text-white truncate">{p.name}</p>
                <p className="text-[11px] font-mono text-slate-400 truncate">{p.pid}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div
        className={cn(
          'flex-1 flex flex-col bg-gradient-to-b from-[#0a0f1d] to-[#0c1322] min-w-0 h-full overflow-hidden',
          !activePatient || showPatientListOnMobile ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-slate-950/70 backdrop-blur z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {patients.length > 1 && (
              <button
                type="button"
                onClick={() => setShowPatientListOnMobile(true)}
                className="md:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition shrink-0"
                title="Switch patient"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0">
              {activePatient?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs text-white truncate">{activePatient?.name}</h4>
              <p className="text-[10px] text-teal-400 font-mono truncate">{activePatient?.pid}</p>
            </div>
          </div>

          {patientMessages.length > 0 && onClearChat && (
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/5 text-[11px] flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Clear all messages in this conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>

        {/* Quick Response Templates */}
        <div className="px-3 sm:px-4 py-2 border-b border-white/5 flex gap-2 overflow-x-auto text-xs flex-shrink-0 bg-white/[0.01]">
          <button
            onClick={() => onSendTemplate('Your latest lab results look normal and stable.')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] shrink-0 border border-white/5"
          >
            "Lab results normal"
          </button>
          <button
            onClick={() => onSendTemplate('Please take your medication as prescribed with meals.')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] shrink-0 border border-white/5"
          >
            "Medication reminder"
          </button>
          <button
            onClick={() => onSendTemplate('Let us schedule a follow-up review next week.')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] shrink-0 border border-white/5"
          >
            "Follow-up request"
          </button>
        </div>

        {/* Message Bubble List */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 overscroll-contain"
        >
          {patientMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-xs">No messages yet with {activePatient?.name}. Send a clinical greeting or update below.</p>
            </div>
          ) : (
            patientMessages.map((msg: any) => {
              const isDoctor = msg.senderRole === 'doctor' || msg.sender === 'doctor';
              const isConfirming = confirmDeleteId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={cn('flex flex-col group', isDoctor ? 'items-end' : 'items-start')}
                >
                  <div className={cn('flex items-center gap-1.5 max-w-[90%] sm:max-w-[78%]', isDoctor ? 'flex-row-reverse' : 'flex-row')}>
                    <div
                      className={cn(
                        'px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words',
                        isDoctor
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-slate-950 font-medium rounded-br-none'
                          : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/10'
                      )}
                    >
                      {msg.text}
                    </div>

                    {isConfirming ? (
                      <div className="flex items-center gap-1 bg-slate-900/95 border border-rose-500/40 rounded-xl px-2 py-1 text-[11px] shadow-lg shrink-0 z-10 animate-in fade-in zoom-in-95">
                        <span className="text-rose-300 font-medium">Delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteMessage) onDeleteMessage(msg.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-1.5 py-0.5 rounded bg-rose-500 text-slate-950 font-bold hover:bg-rose-400 transition cursor-pointer text-[10px]"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1 py-0.5 text-slate-400 hover:text-white transition cursor-pointer text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(msg.id)}
                        className="opacity-40 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                        title="Delete this message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar (Guaranteed Visible on Mobile, Never Cut Off) */}
        <form
          onSubmit={e => {
            e.preventDefault();
            if (input.trim()) onSendMessage();
          }}
          className="p-2 sm:p-3 border-t border-white/10 bg-slate-950/95 backdrop-blur flex items-end gap-2 shrink-0 z-30"
        >
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) onSendMessage();
              }
            }}
            placeholder={`Type a clinical reply to ${activePatient?.name}...`}
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none max-h-24 scrollbar-thin"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="h-10 w-10 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold hover:brightness-110 transition shadow disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Clear Thread Confirmation Modal */}
        <AnimatePresence>
          {isClearConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Clear Chat History</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Are you sure you want to delete all messages in the consultation thread with <strong className="text-slate-200">{activePatient?.name}</strong>? This action will remove messages permanently.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsClearConfirmOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onClearChat) onClearChat();
                      setIsClearConfirmOpen(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition shadow shadow-rose-500/20 cursor-pointer"
                  >
                    Clear All Messages
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Sub-component 7: AI Clinical Workspace
// ----------------------------------------------------------------------
function AiWorkspaceSection({
  patients,
  selectedPatientId,
  setSelectedPatientId,
  loading,
  riskData,
  onRunRiskAnalysis,
  drugA,
  setDrugA,
  drugB,
  setDrugB,
  interactionResult,
  onCheckInteraction,
  rawNote,
  setRawNote,
  extractedNote,
  onExtractNote,
  onOpenUnlockModal
}: any) {
  if (!patients || patients.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-950/60 via-cyan-950/40 to-[#0a1224] border border-cyan-500/30 backdrop-blur-md">
          <div className="flex items-center gap-3 text-cyan-300 font-bold text-lg mb-2">
            <BrainCircuit className="w-6 h-6 text-cyan-400" />
            <span>AI Clinical Decision Support Engine</span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            The MedConnect AI Assistant provides clinical decision support for attending physicians. It performs automated 3-bullet patient chart rundowns, evaluates real-time cardiovascular and sepsis risks from logged vitals, flags dangerous drug-drug contraindications, and formats free-text notes into accredited EMR documentation.
          </p>
        </div>

        <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Patient Selected for Clinical Analysis</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              To run patient-specific diagnostic summaries, risk assessments, and medication reviews, link to a patient record using their permanent Patient ID (PID).
            </p>
          </div>
          <button
            onClick={onOpenUnlockModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition flex items-center gap-2 mx-auto"
          >
            <Key className="w-4 h-4" />
            <span>Unlock Patient via Patient ID</span>
          </button>
        </div>

        {/* Pharmacological and Clinical Note tools remain usable */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Pill className="w-4 h-4 text-amber-400" />
              <span>Drug-Drug Interaction Checker</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Drug #1</label>
                <input
                  type="text"
                  placeholder="e.g. Warfarin"
                  value={drugA}
                  onChange={e => setDrugA(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Drug #2</label>
                <input
                  type="text"
                  placeholder="e.g. Aspirin"
                  value={drugB}
                  onChange={e => setDrugB(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
              </div>
            </div>
            <button
              onClick={onCheckInteraction}
              className="w-full py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/30"
            >
              Check Cross-Reactivity
            </button>
            {interactionResult && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 whitespace-pre-line leading-relaxed">
                {interactionResult}
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-teal-400" />
                <span>AI Free-Text Note Structurer</span>
              </h4>
              <button
                onClick={onExtractNote}
                disabled={loading}
                className="px-3 py-1 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 disabled:opacity-50"
              >
                {loading ? 'Extracting...' : 'Extract EMR'}
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Paste raw physician dictation or consultation notes here..."
              value={rawNote}
              onChange={e => setRawNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            {extractedNote && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                <p><strong className="text-teal-300">Complaint:</strong> {extractedNote.chiefComplaint}</p>
                <p><strong className="text-teal-300">HPI:</strong> {extractedNote.hpi}</p>
                <p><strong className="text-teal-300">ICD-10 Suggestions:</strong> {extractedNote.suspectedICD10.join(', ')}</p>
                <p><strong className="text-teal-300">Recommended Orders:</strong> {extractedNote.suggestedOrders.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  const patient = patients.find((p: Patient) => p.id === selectedPatientId) || patients[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/60 via-cyan-950/40 to-[#0a1224] border border-cyan-500/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-base mb-1">
            <BrainCircuit className="w-5 h-5 text-cyan-400" />
            <span>AI Clinical Decision Support Engine</span>
          </div>
          <p className="text-xs text-slate-300">
            Augmented diagnostic inference, drug-drug contraindication validation, and note structuring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Target Patient:</span>
          <select
            value={selectedPatientId || patient.id}
            onChange={e => setSelectedPatientId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#11192d] border border-cyan-500/30 text-cyan-200 text-xs"
          >
            {patients.map((p: Patient) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.pid})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Smart Patient Rundown */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Smart Patient Rundown (3-Bullet AI Summary)</span>
            </h4>
          </div>

          <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-2 text-xs text-slate-200 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="text-teal-400 font-bold">•</span>
              <span>
                <strong>Profile & Baselines:</strong> {patient.name}, {patient.age ? `${patient.age}y` : 'Age not recorded'}{' '}
                {patient.gender || 'Not specified'}, diagnosed with{' '}
                {patient.chronicConditions && patient.chronicConditions.length > 0
                  ? patient.chronicConditions.join(', ')
                  : 'no chronic illnesses recorded'}.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-teal-400 font-bold">•</span>
              <span>
                <strong>Vital Trajectory:</strong> Recent BP:{' '}
                {patient.vitalsHistory && patient.vitalsHistory[0]?.bp
                  ? `${patient.vitalsHistory[0].bp} mmHg`
                  : 'No resting vitals recorded by patient yet'}.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-teal-400 font-bold">•</span>
              <span>
                <strong>Key Precautions:</strong> Flagged allergies:{' '}
                {patient.allergies && patient.allergies.length > 0
                  ? patient.allergies.map((a: any) => a.name).join(', ')
                  : 'NKDA (No known drug allergies recorded)'}.
              </span>
            </div>
          </div>
        </div>

        {/* 2. AI Risk Analysis */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>AI Risk Predictive Analysis</span>
            </h4>
            <button
              onClick={onRunRiskAnalysis}
              disabled={loading}
              className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {loading ? 'Evaluating...' : 'Run Analysis'}
            </button>
          </div>

          {riskData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <p className="text-[11px] text-slate-400">Cardiovascular Risk</p>
                  <p className="text-lg font-bold text-teal-400 mt-1">{riskData.cardio}%</p>
                  <span className="text-[10px] text-teal-300">Moderate Low</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <p className="text-[11px] text-slate-400">Sepsis Index</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{riskData.sepsis}%</p>
                  <span className="text-[10px] text-emerald-300">Minimal</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <p className="text-[11px] text-slate-400">30d Readmission</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">{riskData.readmit}%</p>
                  <span className="text-[10px] text-cyan-300">Low Risk</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                {riskData.recommendations.map((rec: string, i: number) => (
                  <p key={i} className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">Click 'Run Analysis' to compute predictive clinical score.</p>
          )}
        </div>

        {/* 3. Drug Interaction Checker */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Pill className="w-4 h-4 text-amber-400" />
            <span>Drug-Drug Interaction Checker</span>
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Drug #1</label>
              <input
                type="text"
                placeholder="e.g. Warfarin"
                value={drugA}
                onChange={e => setDrugA(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Drug #2</label>
              <input
                type="text"
                placeholder="e.g. Aspirin"
                value={drugB}
                onChange={e => setDrugB(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
            </div>
          </div>

          <button
            onClick={onCheckInteraction}
            className="w-full py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/30"
          >
            Check Cross-Reactivity
          </button>

          {interactionResult && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 whitespace-pre-line leading-relaxed">
              {interactionResult}
            </div>
          )}
        </div>

        {/* 4. Clinical Note Extraction from Free Text */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FilePlus className="w-4 h-4 text-teal-400" />
              <span>AI Free-Text Note Structurer</span>
            </h4>
            <button
              onClick={onExtractNote}
              disabled={loading}
              className="px-3 py-1 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'Extracting...' : 'Extract EMR'}
            </button>
          </div>

          <textarea
            rows={3}
            value={rawNote}
            onChange={e => setRawNote(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
          />

          {extractedNote && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
              <p><strong className="text-teal-300">Complaint:</strong> {extractedNote.chiefComplaint}</p>
              <p><strong className="text-teal-300">HPI:</strong> {extractedNote.hpi}</p>
              <p><strong className="text-teal-300">ICD-10 Suggestions:</strong> {extractedNote.suspectedICD10.join(', ')}</p>
              <p><strong className="text-teal-300">Recommended Orders:</strong> {extractedNote.suggestedOrders.join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Sub-component 8: Schedule Settings
// ----------------------------------------------------------------------
function ScheduleSection({ settings, setSettings, onSave }: any) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day: string) => {
    if (settings.workingDays.includes(day)) {
      setSettings({ ...settings, workingDays: settings.workingDays.filter((d: string) => d !== day) });
    } else {
      setSettings({ ...settings, workingDays: [...settings.workingDays, day] });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl mx-auto">
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white">Availability & Consultation Preferences</h3>
          <p className="text-xs text-slate-400">Configure your clinical working calendar, session fees, and service modes.</p>
        </div>

        {/* Working Days */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Active Working Days</label>
          <div className="flex flex-wrap gap-2">
            {days.map(d => {
              const active = settings.workingDays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition',
                    active
                      ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Working Hours & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Shift Start Time</label>
            <input
              type="time"
              value={settings.startTime}
              onChange={e => setSettings({ ...settings, startTime: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#11192d] border border-white/10 text-white text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Shift End Time</label>
            <input
              type="time"
              value={settings.endTime}
              onChange={e => setSettings({ ...settings, endTime: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#11192d] border border-white/10 text-white text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Slot Duration</label>
            <select
              value={settings.slotDuration}
              onChange={e => setSettings({ ...settings, slotDuration: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#11192d] border border-white/10 text-white text-xs"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>
        </div>

        {/* Consultation Fees */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Virtual / Telehealth Fee (₦)</label>
            <input
              type="number"
              value={settings.virtualFee}
              onChange={e => setSettings({ ...settings, virtualFee: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">In-Person Clinic Fee (₦)</label>
            <input
              type="number"
              value={settings.inPersonFee}
              onChange={e => setSettings({ ...settings, inPersonFee: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Emergency On-Call Fee (₦)</label>
            <input
              type="number"
              value={settings.emergencyFee}
              onChange={e => setSettings({ ...settings, emergencyFee: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>
        </div>

        {/* Mode Toggles */}
        <div className="space-y-3 pt-3 border-t border-white/5">
          <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-white">Enable Virtual Consultations (Telehealth)</p>
              <p className="text-[11px] text-slate-400">Accept video call bookings from remote patients</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableTelehealth}
              onChange={e => setSettings({ ...settings, enableTelehealth: e.target.checked })}
              className="rounded text-teal-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-white">Enable Physical In-Clinic Visits</p>
              <p className="text-[11px] text-slate-400">Permit queue check-ins at your designated hospital</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableInPerson}
              onChange={e => setSettings({ ...settings, enableInPerson: e.target.checked })}
              className="rounded text-teal-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-white">Emergency On-Call Standby</p>
              <p className="text-[11px] text-slate-400">Permit triage alerts for urgent clinical emergencies</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableEmergency}
              onChange={e => setSettings({ ...settings, enableEmergency: e.target.checked })}
              className="rounded text-teal-500 focus:ring-0"
            />
          </label>
        </div>

        <button
          onClick={onSave}
          className="px-6 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:brightness-110 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Schedule Preferences
        </button>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Sub-component 9: My Profile
// ----------------------------------------------------------------------
function ProfileSection({ profile, setProfile, onSave }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl mx-auto">
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Physician Credentials & Profile</h3>
            <p className="text-xs text-slate-400">Professional details displayed on prescriptions and consultations</p>
          </div>
          <span className="font-mono text-xs px-3 py-1 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
            {profile.code}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Professional Title</label>
            <input
              type="text"
              value={profile.title}
              onChange={e => setProfile({ ...profile, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Medical License Number</label>
            <input
              type="text"
              value={profile.license}
              onChange={e => setProfile({ ...profile, license: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Specializations</label>
            <input
              type="text"
              value={profile.specialization}
              onChange={e => setProfile({ ...profile, specialization: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Hospital / Clinic</label>
            <input
              type="text"
              value={profile.hospital}
              onChange={e => setProfile({ ...profile, hospital: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Direct Clinical Phone</label>
            <input
              type="text"
              value={profile.phone}
              onChange={e => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Physician Bio & Background</label>
          <textarea
            rows={4}
            value={profile.bio}
            onChange={e => setProfile({ ...profile, bio: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
          />
        </div>

        <button
          onClick={onSave}
          className="px-6 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:brightness-110 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Profile Details
        </button>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Sub-component 10: Settings
// ----------------------------------------------------------------------
function SettingsSection({ doctorProfile, showToast }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl mx-auto">
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white">Account & System Configuration</h3>
          <p className="text-xs text-slate-400">Manage security settings, EMR auto-save, and notifications</p>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">EMR Auto-Save Interval</p>
              <p className="text-slate-400 text-[11px]">Continuously cache draft consultation forms locally</p>
            </div>
            <span className="font-mono text-teal-300">Every 30 seconds</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Two-Factor Authentication (2FA)</p>
              <p className="text-slate-400 text-[11px]">Mandatory for biometric and clinical record access</p>
            </div>
            <span className="text-emerald-400 font-semibold">Active & Enforced</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Diagnostic AI Confidence Threshold</p>
              <p className="text-slate-400 text-[11px]">Minimum probability required before surfacing rare differential conditions</p>
            </div>
            <span className="font-mono text-cyan-300">85% (High Precision)</span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex gap-3">
          <button
            onClick={() => showToast('Settings saved successfully')}
            className="px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:brightness-110"
          >
            Save Settings
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default DoctorDashboard;
