import { ShoppingCart } from 'lucide-react';
import { cn } from './utils';

export default function CartIcon({ count = 0, onClick, visible = true }) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 left-6 z-40',
        'w-14 h-14 rounded-full bg-[#c8102e] shadow-lg shadow-red-500/30',
        'flex items-center justify-center',
        'hover:bg-[#b00d24] hover:scale-105 transition-all cursor-pointer'
      )}
    >
      <ShoppingCart size={22} className="text-white" />
      {count > 0 && (
        <span
          className={cn(
            'absolute -top-1 -right-1',
            'min-w-[20px] h-5 px-1 rounded-full',
            'bg-red-700 text-white text-xs font-bold',
            'flex items-center justify-center'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
