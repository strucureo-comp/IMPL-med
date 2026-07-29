import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Search, Bot } from 'lucide-react';

const tabs = [
  { id: 'catalog', label: 'Catalog', icon: Search },
  { id: 'assistant', label: 'Assistant', icon: Bot },
];

export default function TopNav({ activeTab, setActiveTab, openCart, cartCount = 0 }) {
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ width: 0, left: 0 });
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = tabRefs.current[activeTab];
      if (el) {
        setIndicator({ width: el.offsetWidth, left: el.offsetLeft });
      }
    });
  }, [activeTab]);

  useEffect(() => {
    const onScroll = () => {
      const sy = window.scrollY;
      if (sy > lastScrollY.current && sy > 40) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = sy;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 transition-transform duration-300 ease-out"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(-100%)' }}
    >
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="text-lg font-bold tracking-tight">
            <span className="text-[#c8102e]">KLS</span>
            <span className="text-gray-800">martin</span>
          </div>
          <div className="relative flex rounded-2xl bg-gray-100/80 p-1">
            <div
              className="absolute top-1 bottom-1 rounded-2xl bg-white shadow-sm transition-all duration-300 ease-out"
              style={{ width: indicator.width, left: indicator.left }}
            />
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'text-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openCart}
              className="relative p-1.5 text-gray-400 transition-colors hover:text-gray-700"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-[#c8102e] px-0.5 text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
              A
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
