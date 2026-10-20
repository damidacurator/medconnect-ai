import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Brain,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Heart,
  Lock,
  MessageCircle,
  Shield,
  Smartphone,
  Sparkles,
  Stethoscope,
  User,
} from 'lucide-react';
import { AuthModal, type AuthMode } from '@/components/auth/AuthModal';
import { getCurrentProfile, signOut as sbSignOut, type UserRole, type UserProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authRole, setAuthRole] = useState<UserRole>('patient');
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);

  // Check if user has an existing session for navbar convenience, but NEVER force-redirect away from homepage
  useEffect(() => {
    let isMounted = true;
    async function checkExistingSession() {
      try {
        const profile = await getCurrentProfile();
        if (profile && isMounted) {
          setActiveProfile(profile);
        }
      } catch {
        // stay on landing page
      }
    }

    checkExistingSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAuth = (mode: AuthMode, role: UserRole = 'patient') => {
    setAuthMode(mode);
    setAuthRole(role);
    setAuthOpen(true);
  };

  const handleLoginSuccess = (role: UserRole) => {
    if (role === 'doctor') {
      navigate('/doctor');
    } else if (role === 'institution') {
      navigate('/institution');
    } else {
      navigate('/patient');
    }
  };

  const roleCards = [
    {
      role: 'patient' as UserRole,
      title: 'For Patients',
      badge: 'Personal Health Passport',
      icon: User,
      description:
        'Own your complete lifelong medical history in one unified, portable cryptographic record. Consult with doctors and schedule appointments anywhere.',
      features: [
        'Universal portable health records',
        'Direct telemedicine consultations',
        'Prescription tracking & vital alerts',
      ],
      gradient: 'from-cyan-500/20 via-teal-500/10 to-transparent',
      borderGlow: 'hover:border-cyan-400/50',
      buttonBg: 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:from-cyan-400 hover:to-teal-400',
    },
    {
      role: 'doctor' as UserRole,
      title: 'For Physicians',
      badge: 'AI Clinical Workspace',
      icon: Stethoscope,
      description:
        'Intelligent clinical support powered by diagnostic AI, automated notes, instant cross-institution patient record access, and smart prescriptions.',
      features: [
        'AI diagnostic & symptom analysis',
        'Automated EHR & consultation notes',
        'Secure patient referrals & analytics',
      ],
      gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
      borderGlow: 'hover:border-blue-400/50',
      buttonBg: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 hover:from-blue-400 hover:to-cyan-400',
    },
    {
      role: 'institution' as UserRole,
      title: 'For Institutions',
      badge: 'Enterprise Infrastructure',
      icon: Building2,
      description:
        'Interoperable hospital management, staff roster coordination, diagnostics department linking, and institutional compliance reporting.',
      features: [
        'Multi-facility patient sync',
        'Staff credentialing & shift management',
        'HIPAA/GDPR automated compliance audit',
      ],
      gradient: 'from-teal-500/20 via-emerald-500/10 to-transparent',
      borderGlow: 'hover:border-teal-400/50',
      buttonBg: 'bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 hover:from-teal-400 hover:to-emerald-300',
    },
  ];

  const platformFeatures = [
    {
      icon: Heart,
      title: 'Lifelong Medical Records',
      description:
        'A single consolidated, tamper-proof longitudinal health profile aggregating immunizations, lab results, scans, and allergies across lifetime care.',
    },
    {
      icon: Brain,
      title: 'AI Clinical Assistant',
      description:
        'State-of-the-art medical reasoning model aiding clinical triage, spotting drug interactions, and summarizing complex multi-year case histories in seconds.',
    },
    {
      icon: MessageCircle,
      title: 'Telemedicine & Virtual Care',
      description:
        'High-definition encrypted video appointments with built-in instant chart review, biometric screen sharing, and real-time vital metrics capture.',
    },
    {
      icon: Smartphone,
      title: 'Multi-Device Access',
      description:
        'Seamless access across web, tablet, iOS, and Android with offline-first caching for clinical wards and remote field health practitioners.',
    },
    {
      icon: Lock,
      title: 'Security & Privacy',
      description:
        'Zero-knowledge encryption architectures ensuring only authorized patients and clinicians hold access keys, exceeding HIPAA and GDPR standards.',
    },
    {
      icon: Building2,
      title: 'Institution Management',
      description:
        'Comprehensive dashboards for hospitals, labs, and clinics to oversee department queues, billing clearances, and inter-hospital patient transfers.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Glow Highlights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-cyan-500/15 via-teal-500/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[35%] -left-48 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full" />
        <div className="absolute top-[65%] -right-48 w-96 h-96 bg-teal-500/10 blur-[100px] rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-[#070b13]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-400 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Activity className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                MedConnect <span className="text-cyan-400">AI</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Next-Gen Healthcare Protocol
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {activeProfile ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (activeProfile.role === 'doctor') navigate('/doctor');
                    else if (activeProfile.role === 'institution') navigate('/institution');
                    else navigate('/patient');
                  }}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 hover:from-cyan-400 hover:to-teal-300 shadow-md shadow-cyan-950/40 transition-all flex items-center gap-1.5"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await sbSignOut();
                    setActiveProfile(null);
                    window.location.reload();
                  }}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenAuth('signin')}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/5 border border-white/10 transition-all duration-200"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAuth('signup', 'patient')}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 hover:from-cyan-400 hover:to-teal-300 shadow-lg shadow-cyan-950/50 transition-all duration-200 flex items-center space-x-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-16 pb-20 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs sm:text-sm font-medium mb-6 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Universal Medical Records Powered by Clinical AI</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none"
          >
            Unified Healthcare for{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Patients, Doctors & Hospitals
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed"
          >
            MedConnect AI breaks healthcare silos. Patients retain lifelong universal medical records, clinicians leverage instant diagnostic intelligence, and healthcare institutions streamline operations in real time.
          </motion.p>

          {/* Three Portals Grid - Directly in Front Page Hero */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left">
            {roleCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.role}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.12 }}
                  className={cn(
                    'relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300',
                    'bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl group',
                    card.borderGlow
                  )}
                >
                  <div>
                    {/* Role Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-13 h-13 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:bg-cyan-500/10 transition-all duration-300">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {card.badge}
                      </span>
                    </div>

                    <h4 className="text-xl sm:text-2xl font-bold text-white mb-2.5">
                      {card.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-5">
                      {card.description}
                    </p>

                    {/* Features list */}
                    <div className="space-y-2 mb-6">
                      {card.features.map((feat) => (
                        <div key={feat} className="flex items-center space-x-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Role CTA */}
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAuth('signup', card.role)}
                      className={cn(
                        'w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg cursor-pointer',
                        card.buttonBg
                      )}
                    >
                      <span>Get Started as {card.title.replace('For ', '')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAuth('signin', card.role)}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Sign In as {card.title.replace('For ', '')}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Trust Highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-14 pt-10 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
          >
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300">100%</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Patient Record Ownership</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-300">256-Bit</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">End-to-End Encryption</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300">HIPAA & GDPR</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Full Healthcare Compliance</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-300">24/7 AI</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Clinical Support Engine</div>
            </div>
          </motion.div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Comprehensive Health Capabilities</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              An Integrated Clinical Intelligence Platform
            </h3>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Designed from first principles to solve fragmentation in modern healthcare delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {platformFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="rounded-2xl p-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:bg-cyan-500/20 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">
                    {feat.title}
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden bg-gradient-to-tr from-cyan-950/60 via-slate-900/80 to-teal-950/40 border border-cyan-500/30 text-center shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Ready to Experience Connected Healthcare?
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Join thousands of patients, physicians, and health systems moving towards unified, intelligent medical records today.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleOpenAuth('signup', 'patient')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 hover:from-cyan-400 hover:to-teal-300 shadow-xl transition-all duration-200"
                >
                  Get Started Now
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAuth('signin')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all duration-200"
                >
                  Sign In to Account
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#05080e] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center space-x-2.5 text-slate-400">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">MedConnect AI</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6">
            <span className="hover:text-cyan-400 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-cyan-400 cursor-pointer transition-colors">HIPAA Compliance</span>
            <span className="hover:text-cyan-400 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-cyan-400 cursor-pointer transition-colors">Support</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal Component */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        initialRole={authRole}
        onLogin={handleLoginSuccess}
      />
    </div>
  );
};
