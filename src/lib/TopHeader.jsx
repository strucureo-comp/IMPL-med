import { Menu, ShoppingBag, Download } from 'lucide-react';
import { cn } from './utils';
import { motion } from 'framer-motion';

export default function TopHeader({
  activeView = 'agent',
  onViewChange,
  cartCount = 0,
  rightPanelOpen,
  onToggleRightPanel,
  onToggleSidebar,
  onOpenCheckout,
}) {
  return (
    <header className="h-16 shrink-0 z-30 flex items-center justify-between px-6 bg-white/80 backdrop-blur-2xl sticky top-0 border-b border-black/[0.04]">
      {/* Left Brand */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-full hover:bg-gray-100 text-[#1D1D1F] md:hidden transition-colors"
          aria-label="Toggle navigation drawer"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onViewChange('agent')}>
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shadow-md group-hover:scale-105 transition-transform">
            KM
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-[#1D1D1F] tracking-tight font-display">KLS Martin</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-bold text-[#86868B] uppercase tracking-wider">
              IMPL AI
            </span>
          </div>
        </div>
      </div>

      {/* Center Tab Switcher */}
      <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center p-1 rounded-full bg-gray-100/80 border border-black/[0.04]">
        {['agent', 'catalog', 'admin'].map((view) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={cn(
              'relative px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-300',
              activeView === view ? 'text-black' : 'text-[#86868B] hover:text-black'
            )}
          >
            {activeView === view && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white rounded-full shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 capitalize">
              {view === 'agent' ? 'Match Agent' : view === 'catalog' ? 'Catalog' : 'Admin Hub'}
            </span>
          </button>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {cartCount > 0 && (
          <button
            onClick={onOpenCheckout}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-sm font-medium transition-transform active:scale-95"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        )}

        <button
          onClick={onToggleRightPanel}
          className={cn(
            'relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300',
            rightPanelOpen
              ? 'bg-black text-white border-black shadow-md'
              : 'bg-white text-[#1D1D1F] border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          )}
        >
          <ShoppingBag size={18} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
