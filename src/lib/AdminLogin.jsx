import { useState } from 'react';
import { Lock } from 'lucide-react';
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
      setError(err.message || 'Incorrect password. Please try again.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[400px] bg-white rounded-3xl shadow-modal p-8 animate-scale">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center mb-4 shadow-glow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
              <path d="M2 12h2l3-9 4 18 4-12 3 6h4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-text-primary">IMPL</span>
          </h1>
        </div>

        <div className="text-center mb-7">
          <h2 className="text-base font-semibold text-text-primary">Admin Access</h2>
          <p className="text-sm text-text-secondary mt-1">Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoFocus
              disabled={loading}
              className={cn('input-field pl-11', error && 'ring-4 ring-red-soft border-red-vibrant/30')}
            />
          </div>

          {error && (
            <p className="text-sm text-red-vibrant bg-red-soft rounded-2xl px-4 py-3 mb-4 flex items-start gap-2">
              <Lock size={13} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Logging in...
              </span>
            ) : 'Login'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button onClick={onClose} disabled={loading} className="text-sm text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50">
            Cancel
          </button>
        </div>

        <div className="text-center mt-6 pt-5 border-t border-stone-100/50">
          <p className="text-xs text-text-muted">IMPL Surgical Systems &middot; Secure Access</p>
        </div>
      </div>
    </div>
  );
}