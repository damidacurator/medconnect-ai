import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { GlassModal } from '@/components/shared/GlassModal';
import {
  signIn,
  signUp,
  resetPassword,
  type UserRole,
  type SignUpParams,
} from '@/lib/supabase';
import { cn } from '@/lib/utils';

export type AuthMode = 'signin' | 'signup' | 'forgotPassword';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  initialRole?: UserRole;
  onLogin?: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  initialRole = 'patient',
  onLogin,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Role-specific fields
  // Patient
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('prefer-not-to-say');
  const [bloodGroup, setBloodGroup] = useState('');

  // Doctor
  const [councilReg, setCouncilReg] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');

  // Institution
  const [institutionName, setInstitutionName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [category, setCategory] = useState('General Hospital');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setErrorMsg(null);
      setResetSuccess(false);
    }
  }, [isOpen, initialMode, initialRole]);

  const resetFormState = () => {
    setErrorMsg(null);
    setResetSuccess(false);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setErrorMsg(null);
  };

  const handleSwitchMode = (newMode: AuthMode) => {
    resetFormState();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'forgotPassword') {
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }
        await resetPassword(email.trim());
        setResetSuccess(true);
        setIsLoading(false);
        return;
      }

      if (mode === 'signin') {
        if (!email.trim() || !password) {
          throw new Error('Please provide both email and password.');
        }
        const data = await signIn(email.trim(), password);
        const resolvedRole = (data.user?.user_metadata?.role as UserRole) || role;
        onLogin?.(resolvedRole);
        onClose();
        return;
      }

      if (mode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name or contact person name.');
        }
        if (!email.trim()) {
          throw new Error('Please enter a valid email address.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (!termsAccepted) {
          throw new Error('Please accept the HIPAA & GDPR Privacy Terms to proceed.');
        }

        const roleSpecificData: SignUpParams['roleSpecificData'] = {};

        if (role === 'patient') {
          roleSpecificData.dob = dob;
          roleSpecificData.gender = gender;
          roleSpecificData.bloodGroup = bloodGroup;
        } else if (role === 'doctor') {
          if (!councilReg.trim()) {
            throw new Error('Please provide your medical council registration number.');
          }
          roleSpecificData.councilReg = councilReg;
          roleSpecificData.specialization = specialization;
          roleSpecificData.experience = experience;
        } else if (role === 'institution') {
          if (!institutionName.trim()) {
            throw new Error('Please provide the institution or hospital name.');
          }
          roleSpecificData.institutionName = institutionName;
          roleSpecificData.regNumber = regNumber;
          roleSpecificData.category = category;
        }

        await signUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role,
          phone: phone.trim() || undefined,
          roleSpecificData,
        });

        onLogin?.(role);
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('An unexpected authentication error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions: {
    id: UserRole;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'patient',
      title: 'Patient',
      subtitle: 'Universal health passport',
      icon: User,
    },
    {
      id: 'doctor',
      title: 'Doctor',
      subtitle: 'Clinical assistant & EHR',
      icon: Stethoscope,
    },
    {
      id: 'institution',
      title: 'Institution',
      subtitle: 'Hospital & enterprise lab',
      icon: Building2,
    },
  ];

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      size={mode === 'signup' ? 'lg' : 'md'}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-950/50">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your MedConnect Account'}
            {mode === 'forgotPassword' && 'Reset Password'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'signin' && 'Access your encrypted medical data & workspace'}
            {mode === 'signup' && 'Join the decentralized, AI-native health ecosystem'}
            {mode === 'forgotPassword' && 'We will send a secure recovery link to your inbox'}
          </p>
        </div>

        {/* Role Selector Tabs (shown on signup and signin) */}
        {mode !== 'forgotPassword' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Account Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = role === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleRoleChange(opt.id)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col items-center sm:items-start space-y-1',
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/30'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isSelected ? 'text-cyan-400' : 'text-slate-400')} />
                    <span className="font-semibold text-xs text-white block">{opt.title}</span>
                    <span className="hidden sm:block text-[10px] text-slate-400 leading-tight">
                      {opt.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Forgot password success state */}
        {mode === 'forgotPassword' && resetSuccess ? (
          <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto" />
            <h4 className="text-white font-medium text-base">Reset Link Sent</h4>
            <p className="text-sm text-slate-300">
              If an account matches <strong className="text-teal-300">{email}</strong>, you will receive password reset instructions shortly.
            </p>
            <button
              type="button"
              onClick={() => handleSwitchMode('signin')}
              className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          /* Form Content with Animation */
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${role}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Signup basic info */}
                {mode === 'signup' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {role === 'institution' ? 'Contact Person / Administrator Name' : 'Full Name'} *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={role === 'doctor' ? 'Dr. Sarah Jenkins' : 'Alex Morgan'}
                          className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Email field */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password field (signin and signup) */}
                {mode !== 'forgotPassword' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-300">
                        Password *
                      </label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => handleSwitchMode('forgotPassword')}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Role-specific fields for SIGNUP */}
                {mode === 'signup' && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-3">
                    <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                      {role === 'patient' && 'Patient Profile Information'}
                      {role === 'doctor' && 'Medical Credentials & Practice'}
                      {role === 'institution' && 'Organization Details'}
                    </div>

                    {/* Common Phone field */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Patient specific fields */}
                    {role === 'patient' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Gender
                          </label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="prefer-not-to-say">Prefer not to say</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Blood Group
                          </label>
                          <select
                            value={bloodGroup}
                            onChange={(e) => setBloodGroup(e.target.value)}
                            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="">Select</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Doctor specific fields */}
                    {role === 'doctor' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Council Reg No. *
                          </label>
                          <input
                            type="text"
                            required
                            value={councilReg}
                            onChange={(e) => setCouncilReg(e.target.value)}
                            placeholder="MDC-84920"
                            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Specialization
                          </label>
                          <input
                            type="text"
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                            placeholder="Cardiology"
                            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Experience (Yrs)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            placeholder="8"
                            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Institution specific fields */}
                    {role === 'institution' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Institution Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={institutionName}
                              onChange={(e) => setInstitutionName(e.target.value)}
                              placeholder="Apex Metropolitan Hospital"
                              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Registration Number
                            </label>
                            <input
                              type="text"
                              value={regNumber}
                              onChange={(e) => setRegNumber(e.target.value)}
                              placeholder="HOSP-REG-4892"
                              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Facility Category
                          </label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="General Hospital">General Hospital</option>
                            <option value="Specialist Clinic">Specialist Clinic</option>
                            <option value="Diagnostic Laboratory">Diagnostic Laboratory</option>
                            <option value="Urgent Care Center">Urgent Care Center</option>
                            <option value="Research Facility">Academic / Research Hospital</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Terms checkbox for signup */}
                {mode === 'signup' && (
                  <div className="flex items-start space-x-2 pt-1">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30"
                    />
                    <label htmlFor="terms" className="text-xs text-slate-400 leading-snug">
                      I accept the{' '}
                      <span className="text-cyan-400 underline cursor-pointer">
                        Terms of Service
                      </span>{' '}
                      and agree to secure, encrypted end-to-end medical data handling under HIPAA & GDPR standards.
                    </label>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg flex items-center justify-center space-x-2',
                'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-cyan-900/30',
                isLoading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-950" />}
              <span>
                {mode === 'signin' && (isLoading ? 'Signing In...' : 'Sign In to Workspace')}
                {mode === 'signup' && (isLoading ? 'Creating Account...' : 'Complete Registration')}
                {mode === 'forgotPassword' && (isLoading ? 'Sending Link...' : 'Send Reset Link')}
              </span>
            </button>
          </form>
        )}

        {/* Footer switch between Sign In and Sign Up */}
        <div className="pt-2 border-t border-white/10 text-center text-xs text-slate-400">
          {mode === 'signin' && (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signup')}
                className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Sign Up
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === 'forgotPassword' && !resetSuccess && (
            <button
              type="button"
              onClick={() => handleSwitchMode('signin')}
              className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              ← Back to Sign In
            </button>
          )}
        </div>
      </div>
    </GlassModal>
  );
};
