import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Shield, X, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from './utils';
import { adminLogin } from './api';

export default function AdminLogin({ onClose, onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await adminLogin(password);
      onLogin(data.token);
    } catch (err) {
      setError(err.message || 'Incorrect admin authentication password.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-zinc-200 p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center mb-3 shadow-md">
            <Shield size={22} />
          </div>
          <h2 className="text-base font-bold text-zinc-950">Admin Operations Portal</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Authenticate to manage the IMPL catalog database, configure competitor mappings, and import CSV batches.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoFocus
              disabled={loading}
              className="w-full pl-10 pr-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-950 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Authenticating…' : 'Sign In to Admin Operations'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-zinc-100 text-center text-[11px] text-zinc-400 font-mono">
          IMPL Precision Surgical Catalog • ISO 13485
        </div>
      </motion.div>
    </div>
  );
}
