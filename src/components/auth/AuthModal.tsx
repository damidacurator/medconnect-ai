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
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { GlassModal } from '@/components/shared/GlassModal';
import { signIn, signUp, resetPassword, type UserRole } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export type AuthMode = 'signin' | 'signup' | 'forgotPassword';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  initialRole?: UserRole;
  onLogin?: (role: UserRole) => void;
}

const roleOptions: {
  id: UserRole;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    id: 'patient',
    title: 'Patient',
    subtitle: 'Personal health passport',
    icon: User,
    color: 'cyan',
  },
  {
    id: 'doctor',
    title: 'Doctor',
    subtitle: 'Clinical workspace',
    icon: Stethoscope,
    color: 'teal',
  },
  {
    id: 'institution',
    title: 'Institution',
    subtitle: 'Hospital & enterprise',
    icon: Building2,
    color: 'indigo',
  },
];

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Form fields — name + email + password + confirm only
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setErrorMsg(null);
      setEmailSent(false);
      setResetSuccess(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirm(false);
    }
  }, [isOpen, initialMode, initialRole]);

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setErrorMsg(null);
    setEmailSent(false);
    setResetSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      /* ── Forgot Password ── */
      if (mode === 'forgotPassword') {
        if (!email.trim()) throw new Error('Please enter your email address.');
        await resetPassword(email.trim());
        setResetSuccess(true);
        setIsLoading(false);
        return;
      }

      /* ── Sign In ── */
      if (mode === 'signin') {
        if (!email.trim() || !password) throw new Error('Please provide your email and password.');
        const data = await signIn(email.trim(), password);
        const resolvedRole = (data.user?.user_metadata?.role as UserRole) || role;
        onLogin?.(resolvedRole);
        onClose();
        return;
      }

      /* ── Sign Up ── */
      if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Please enter your full name.');
        if (!email.trim()) throw new Error('Please enter a valid email address.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        await signUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role,
          roleSpecificData: {},
        });

        // Show "check your email" screen — do NOT redirect to dashboard
        setEmailSent(true);
        setIsLoading(false);
        return;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Make Supabase error messages more user-friendly
        const msg = err.message;
        if (msg.includes('Email not confirmed')) {
          setErrorMsg('Please confirm your email before signing in. Check your inbox.');
        } else if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
          setErrorMsg('Incorrect email or password. Please try again.');
        } else if (msg.includes('User already registered')) {
          setErrorMsg('An account with this email already exists. Please sign in instead.');
        } else {
          setErrorMsg(msg);
        }
      } else {
        setErrorMsg('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Email Sent Confirmation Screen ─── */
  if (emailSent) {
    return (
      <GlassModal isOpen={isOpen} onClose={onClose} size="md">
        <div className="text-center space-y-5 py-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <CheckCircle2 className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Check Your Inbox</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              We've sent a confirmation link to{' '}
              <span className="text-cyan-300 font-medium">{email}</span>.
              <br />
              Click the link in the email to activate your account.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
            <p className="text-xs text-amber-300 leading-relaxed">
              <span className="font-semibold">Don't see it?</span> Check your spam/junk folder. The link expires in 24 hours.
            </p>
          </div>
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-sm font-medium transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </GlassModal>
    );
  }

  /* ─── Reset Success Screen ─── */
  if (mode === 'forgotPassword' && resetSuccess) {
    return (
      <GlassModal isOpen={isOpen} onClose={onClose} size="md">
        <div className="text-center space-y-5 py-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <CheckCircle2 className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Reset Link Sent</h2>
            <p className="text-sm text-slate-400 mt-2">
              If <span className="text-cyan-300 font-medium">{email}</span> is registered, you'll receive reset instructions shortly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-sm font-semibold transition-all hover:opacity-90"
          >
            Back to Sign In
          </button>
        </div>
      </GlassModal>
    );
  }

  /* ─── Main Modal ─── */
  return (
    <GlassModal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-950/50">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgotPassword' && 'Reset Password'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'signin' && 'Sign in to your MedConnect workspace'}
            {mode === 'signup' && 'Join the MedConnect AI health platform'}
            {mode === 'forgotPassword' && 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Role Selector — shown on signin and signup */}
        {mode !== 'forgotPassword' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Account Type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const sel = role === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setRole(opt.id); setErrorMsg(null); }}
                    className={cn(
                      'p-3 rounded-xl border text-center transition-all duration-200 flex flex-col items-center gap-1',
                      sel
                        ? 'bg-cyan-500/15 border-cyan-500/40 ring-1 ring-cyan-500/30'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', sel ? 'text-cyan-400' : 'text-slate-400')} />
                    <span className={cn('text-xs font-semibold', sel ? 'text-cyan-300' : 'text-slate-300')}>
                      {opt.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${role}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {/* Full Name (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {role === 'institution' ? 'Contact Person / Administrator Name' : 'Full Name'} *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={role === 'doctor' ? 'Dr. Full Name' : role === 'institution' ? 'Administrator Name' : 'Your full name'}
                      className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              {mode !== 'forgotPassword' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Password *</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgotPassword')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                      className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className={cn(
                        'w-full bg-slate-800/60 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors',
                        confirmPassword && confirmPassword !== password
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-white/10 focus:border-cyan-500 focus:ring-cyan-500/30'
                      )}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                  )}
                </div>
              )}

              {/* Signup note */}
              {mode === 'signup' && (
                <p className="text-xs text-slate-500 leading-relaxed pt-1">
                  By creating an account you agree to our{' '}
                  <span className="text-cyan-400 underline cursor-pointer">Terms of Service</span> and acknowledge our{' '}
                  <span className="text-cyan-400 underline cursor-pointer">Privacy Policy</span>. Your data is encrypted and handled in compliance with HIPAA & GDPR standards.
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-1',
              'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-cyan-900/30',
              isLoading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' && (isLoading ? 'Signing In…' : 'Sign In')}
            {mode === 'signup' && (isLoading ? 'Creating Account…' : 'Create Account')}
            {mode === 'forgotPassword' && (isLoading ? 'Sending…' : 'Send Reset Link')}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 text-center text-xs text-slate-400">
          {mode === 'signin' && (
            <p>
              Don't have an account?{' '}
              <button type="button" onClick={() => switchMode('signup')} className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors">
                Sign Up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('signin')} className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors">
                Sign In
              </button>
            </p>
          )}
          {mode === 'forgotPassword' && (
            <button type="button" onClick={() => switchMode('signin')} className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors">
              ← Back to Sign In
            </button>
          )}
        </div>
      </div>
    </GlassModal>
  );
};
