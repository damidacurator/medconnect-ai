import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, FileQuestion } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center mb-6 shadow-lg shadow-cyan-950/40">
          <FileQuestion className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
          Error 404
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 mb-3">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          The healthcare portal route or record you requested does not exist or may have been relocated.
        </p>

        <Link
          to="/"
          className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 hover:from-cyan-400 hover:to-teal-300 shadow-lg shadow-cyan-950/50 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to MedConnect AI</span>
        </Link>
      </div>

      <div className="mt-8 flex items-center space-x-2 text-xs text-slate-500">
        <Activity className="w-4 h-4 text-cyan-500" />
        <span>MedConnect AI Healthcare Platform</span>
      </div>
    </div>
  );
};
