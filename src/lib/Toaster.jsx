import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from './utils';

export default function Toaster({ message, onClose, onViewCart }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 250);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-950 text-white rounded-2xl shadow-2xl border border-zinc-800 transition-all duration-300 text-xs font-medium',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0 pointer-events-none'
      )}
    >
      <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
        <CheckCircle2 size={13} />
      </span>
      <span className="text-zinc-100">
        {typeof message === 'object' ? message.message : message}
      </span>
      {onViewCart && (
        <button
          onClick={onViewCart}
          className="ml-1 px-3 py-1 rounded-full bg-white text-zinc-950 text-xs font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          View Tray
        </button>
      )}
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 250);
        }}
        className="ml-1 p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
      >
        <X size={13} />
      </button>
    </div>
  );
}
