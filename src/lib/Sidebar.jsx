import { useState, useEffect } from 'react';
import { MessageSquare, BookOpen, Shield, Plus, X, Clock, Trash2, Heart, Brain, Scissors, Activity } from 'lucide-react';
import { cn } from './utils';
import { searchProducts, getFamilies } from './api';

const SPECIALTY_PROJECTS = [
  { name: 'Cardio & Thoracic', specialty: 'Cardio', icon: Heart, hoverColor: 'group-hover:text-red-500' },
  { name: 'Neurosurgery & Spine', specialty: 'Neurosurgery', icon: Brain, hoverColor: 'group-hover:text-blue-500' },
  { name: 'Plastic & Recon', specialty: 'Plastic Surgery', icon: Scissors, hoverColor: 'group-hover:text-emerald-500' },
  { name: 'General & Ortho', specialty: 'Other', icon: Activity, hoverColor: 'group-hover:text-amber-500' },
];

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function SidebarContent({
  view,
  onViewChange,
  showClose,
  onClose,
  onNewSession,
  history = [],
  onHistoryClick,
  onClearHistory,
  onSelectSpecialty,
  activeSpecialty,
}) {
  const [counts, setCounts] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const families = await getFamilies();
        const results = {};
        SPECIALTY_PROJECTS.forEach(p => results[p.specialty] = 0);
        families.forEach(f => {
          if (results[f.specialty] !== undefined) {
            results[f.specialty] += (f.count || 0);
          }
        });
        if (!cancelled) {
          setCounts(results);
          setLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load specialty counts", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSpecialtyClick = (specialty) => {
    onSelectSpecialty?.(specialty);
    onViewChange?.('catalog');
    if (window.innerWidth < 768 && onClose) {
      onClose();
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg)] border-r border-[var(--color-border)] text-[var(--color-text)] text-sm select-none">
      {/* Brand Header for Mobile */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--color-border)] md:hidden bg-[var(--color-bg)]">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onNewSession}>
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            KM
          </div>
          <span className="font-bold text-sm text-[var(--color-text)]">KLS Martin</span>
        </div>
        {showClose && (
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 text-[var(--color-text-muted)] transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-3 pt-5 space-y-5 flex-1 overflow-y-auto">
        {/* New Search - Flat Black Button */}
        <button
          onClick={onNewSession}
          className="w-full btn-primary px-4 py-2.5 rounded-full flex items-center justify-center gap-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Match Session</span>
        </button>

        {/* Navigation (Mobile Only) */}
        <div className="md:hidden space-y-0.5">
          <div className="px-2 pb-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Views</div>
          <button onClick={() => onViewChange('agent')} className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors', view === 'agent' ? 'bg-[var(--color-card)] shadow-sm border border-[var(--color-border)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/5')}>
            <MessageSquare size={15} /><span>Agent</span>
          </button>
          <button onClick={() => onViewChange('catalog')} className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors', view === 'catalog' ? 'bg-[var(--color-card)] shadow-sm border border-[var(--color-border)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/5')}>
            <BookOpen size={15} /><span>Catalog</span>
          </button>
        </div>

        {/* Specialties */}
        <div className="space-y-1 pt-1">
          <div className="px-2 pb-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Catalog Specialties</div>
          {SPECIALTY_PROJECTS.map((item) => {
            const isSelected = view === 'catalog' && activeSpecialty === item.specialty;
            const IconComponent = item.icon;
            
            // Extract the color tailwind class (e.g., 'group-hover:text-emerald-500' -> 'text-emerald-500')
            const colorClass = item.hoverColor.replace('group-hover:', '');
            
            return (
              <button
                key={item.name}
                onClick={() => handleSpecialtyClick(item.specialty)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-300 group cursor-pointer relative overflow-hidden',
                  isSelected 
                    ? 'bg-[var(--color-card)] shadow-sm border border-[var(--color-border)] font-semibold text-[var(--color-text)]' 
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:bg-gradient-to-tr hover:from-white/60 hover:to-[var(--color-card)] border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                  <IconComponent 
                    size={15} 
                    className={cn(
                      "transition-all duration-300", 
                      isSelected ? colorClass : `text-[var(--color-text-muted)] opacity-70 group-hover:opacity-100 ${item.hoverColor}`
                    )} 
                    fill={isSelected ? "currentColor" : "none"}
                    style={{ 
                      // Apply fill on hover using a CSS trick (since we can't easily dynamically change the prop on hover without state)
                      // Actually, we can just use tailwind group-hover:fill-current
                    }}
                  />
                  {/* Tailwind trick: force SVG to fill on group hover */}
                  <style>{`.group:hover svg { fill: currentColor; }`}</style>
                  
                  <span className="truncate text-[13px]">{item.name}</span>
                </div>
                <span className={cn(
                  "text-[10px] font-mono relative z-10 transition-colors duration-300",
                  isSelected ? "text-[var(--color-text-muted)] font-medium" : "text-[var(--color-text-muted)] opacity-60 group-hover:text-[var(--color-text)]"
                )}>
                  {loaded ? counts[item.specialty] : '...'}
                </span>
                
                {/* Glossy overlay effect on hover */}
                {!isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* Recent Searches */}
        <div className="space-y-0.5 pt-2">
          <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            <span>Recent Activity</span>
            {history.length > 0 && (
              <button onClick={onClearHistory} className="hover:text-[var(--color-text)] transition-colors"><Trash2 size={12} /></button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-[var(--color-text-muted)]">No recent searches</p>
          ) : (
            history.slice(0, 8).map((item, idx) => (
              <button
                key={idx}
                onClick={() => onHistoryClick?.(item)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-black/5 transition-colors group cursor-pointer"
              >
                <Clock size={13} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] shrink-0" />
                <span className="text-[13px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] truncate flex-1 font-medium">
                  {item.requirement || item.query}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose, view, onViewChange, onNewSession, history, onHistoryClick, onClearHistory, onSelectSpecialty, activeSpecialty }) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-900/20 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}
      <aside className={cn('fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-transparent transition-transform duration-300 md:hidden', isOpen ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent view={view} onViewChange={onViewChange} onNewSession={onNewSession} showClose onClose={onClose} history={history} onHistoryClick={onHistoryClick} onClearHistory={onClearHistory} onSelectSpecialty={onSelectSpecialty} activeSpecialty={activeSpecialty} />
      </aside>
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-full bg-[var(--color-bg)]">
        <SidebarContent view={view} onViewChange={onViewChange} onNewSession={onNewSession} history={history} onHistoryClick={onHistoryClick} onClearHistory={onClearHistory} onSelectSpecialty={onSelectSpecialty} activeSpecialty={activeSpecialty} />
      </aside>
    </>
  );
}
