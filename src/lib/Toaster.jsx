import { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { cn } from './utils';

export default function Toaster({ message, onClose, onViewCart }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 z-50 flex items-center gap-3 px-4 py-3',
        'bg-gray-900 text-white rounded-lg shadow-lg border border-gray-700',
        'transition-all duration-300 ease-in-out',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none'
      )}
      style={{ transform: 'translateX(-50%)' }}
    >
      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      {onViewCart && (
        <button
          onClick={onViewCart}
          className="text-sm text-red-400 underline hover:text-red-300 transition-colors ml-2"
        >
          View Cart
        </button>
      )}
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 p-1 rounded hover:bg-gray-700 transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
