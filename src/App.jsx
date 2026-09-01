import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './lib/Sidebar';
import TopHeader from './lib/TopHeader';
import AgentView from './lib/AgentView';
import CatalogView from './lib/CatalogView';
import AdminView from './lib/AdminView';
import RightPanel from './lib/RightPanel';
import ProductDetail from './lib/ProductDetail';
import CheckoutPreview from './lib/CheckoutPreview';
import AdminLogin from './lib/AdminLogin';
import Toaster from './lib/Toaster';
import {
  getSessionId,
  getCart,
  addToCart as apiAddToCart,
  updateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart,
  getSearchHistory,
  saveSearchHistoryEntry,
  clearSearchHistoryDB
} from './lib/api';

export default function App() {
  const [view, setView] = useState('agent');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const isAdminAuthenticated = !!adminToken;
  const [cartItems, setCartItems] = useState([]);
  const [cartTotalItems, setCartTotalItems] = useState(0);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [identified, setIdentified] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [activeSpecialty, setActiveSpecialty] = useState(null);
  const [initialAgentQuery, setInitialAgentQuery] = useState('');
  const [sessionKey, setSessionKey] = useState(0);

  const sessionId = useRef(getSessionId());

  useEffect(() => {
    getSearchHistory().then(data => {
      if (data && data.history) {
        const parsed = data.history.map(h => {
          let state = {};
          try { state = JSON.parse(h.state_json); } catch(e) {}
          return { requirement: h.requirement, timestamp: h.timestamp, state };
        });
        setSearchHistory(parsed);
      }
    }).catch(console.error);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const data = await getCart(sessionId.current);
      setCartItems(data.items || []);
      setCartTotalItems(data.total_items || 0);
    } catch (err) {
      console.error('Cart load failed:', err);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin' || window.location.hash === '#/admin') {
        if (!isAdminAuthenticated) {
          setShowAdminLogin(true);
        } else {
          setView('admin');
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [isAdminAuthenticated]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addToCart = async (product, competitorContext, quantity = 1) => {
    try {
      const context = competitorContext || product._competitorContext || {};
      const options = {
        competitor_code: context.competitor_code,
        competitor_name: context.competitor_name,
        competitor_manufacturer: context.competitor_manufacturer,
        match_percent: context.match_percent ?? product.match_percent
      };
      
      await apiAddToCart(sessionId.current, product.code, quantity, options);
      await refreshCart();
      showToast(options.match_percent === 100 ? 'Added \u2728 100% exact match' : 'Added to Surgery Tray');
      setRightPanelOpen(true);
    } catch (err) {
      console.error('Failed to add to cart:', err);
      showToast('Failed to add instrument to tray');
    }
  };

  const updateCartQuantity = async (code, delta) => {
    const item = cartItems.find((i) => i.product_code === code);
    if (!item) return;
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      return removeFromCart(code);
    }
    try {
      await updateCartItem(sessionId.current, item.id, newQuantity);
      await refreshCart();
    } catch (err) {
      console.error('Failed to update cart:', err);
    }
  };

  const removeFromCart = async (code) => {
    const item = cartItems.find((i) => i.product_code === code);
    if (!item) return;
    try {
      await apiRemoveFromCart(sessionId.current, item.id);
      await refreshCart();
    } catch (err) {
      console.error('Failed to remove from cart:', err);
    }
  };

  const clearCart = async () => {
    try {
      await apiClearCart(sessionId.current);
      await refreshCart();
      showToast('Surgery Tray cleared');
    } catch (err) {
      console.error('Failed to clear cart:', err);
    }
  };

  const handleViewChange = (v) => {
    if (v === 'admin' && !isAdminAuthenticated) {
      setShowAdminLogin(true);
      return;
    }
    setView(v);
    setSidebarOpen(false);
  };

  const handleNewSession = () => {
    setView('agent');
    setCandidates([]);
    setIdentified(null);
    setInitialAgentQuery('');
    setActiveSpecialty(null);
    setSidebarOpen(false);
    setSessionKey((k) => k + 1);
  };

  const addSearchHistory = useCallback((entry) => {
    setSearchHistory((prev) => {
      const next = [
        entry,
        ...prev.filter(
          (h) => h.requirement !== entry.requirement
        ),
      ].slice(0, 50);
      return next;
    });
    saveSearchHistoryEntry({
      requirement: entry.requirement,
      timestamp: entry.timestamp,
      state_json: JSON.stringify(entry.state)
    }).catch(console.error);
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    clearSearchHistoryDB().catch(console.error);
  }, []);

  const handleHistoryClick = (item) => {
    setView('agent');
    if (item.state) {
      setInitialAgentQuery({ isRestored: true, state: item.state });
    } else {
      setInitialAgentQuery(item.requirement || item.query);
    }
    setSessionKey((k) => k + 1);
    setSidebarOpen(false);
  };

  const handleSpecialtySelect = (specialty) => {
    setActiveSpecialty(specialty);
    if (view === 'catalog') {
      // Stay in catalog with specialty active
    } else {
      setView('agent');
      setInitialAgentQuery(`${specialty} surgical instrument requirements`);
      setSessionKey((k) => k + 1);
    }
    setSidebarOpen(false);
  };

  if (view === 'admin' && isAdminAuthenticated) {
    return (
      <div className="h-screen w-full bg-zinc-50 flex flex-col overflow-hidden">
        <AdminView
          token={adminToken}
          onLogout={() => {
            setAdminToken(null);
            setView('agent');
            window.location.hash = '';
          }}
          onGoBack={() => {
            setView('agent');
            window.location.hash = '';
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-canvas h-screen w-full flex flex-col overflow-hidden bg-[#FAFAFA] text-zinc-900">
      {/* Top Header */}
      <TopHeader
        activeView={view}
        onViewChange={handleViewChange}
        cartCount={cartTotalItems}
        rightPanelOpen={rightPanelOpen}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sessionTitle="Surgical AI Matcher"
        sessionSubtitle={activeSpecialty ? activeSpecialty : ''}
        onOpenCheckout={() => setShowCheckout(true)}
        onNewSession={handleNewSession}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          view={view}
          onViewChange={handleViewChange}
          onNewSession={handleNewSession}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          history={searchHistory}
          onHistoryClick={handleHistoryClick}
          onClearHistory={clearSearchHistory}
          onSelectSpecialty={handleSpecialtySelect}
          activeSpecialty={activeSpecialty}
        />

        {/* Center Main Viewport */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
          {view === 'agent' && (
            <AgentView
              key={sessionKey}
              initialQuery={initialAgentQuery}
              restoredState={initialAgentQuery?.isRestored ? initialAgentQuery.state : null}
              onSessionComplete={(sessionState) => {
                const req = sessionState.identified?.product_type || sessionState.identified?.name || sessionState.activeQuery;
                if (req) {
                  addSearchHistory({
                    requirement: req,
                    timestamp: sessionState.timestamp || Date.now(),
                    view: 'agent',
                    state: sessionState
                  });
                }
              }}
              onIdentified={(item) => {
                setIdentified(item);
              }}
              onCandidates={setCandidates}
              onSelectProduct={setSelectedProduct}
              addToCart={addToCart}
            />
          )}

          {view === 'catalog' && (
            <CatalogView
              onSelectProduct={setSelectedProduct}
              addToCart={addToCart}
              activeCategorySpecialty={activeSpecialty}
            />
          )}

          </main>

        {/* Right Surgery Tray Drawer */}
        {rightPanelOpen && (
          <RightPanel
            cartItems={cartItems}
            onRemoveFromCart={removeFromCart}
            onUpdateQuantity={updateCartQuantity}
            onCheckout={() => setShowCheckout(true)}
            onClearCart={clearCart}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            onClose={() => setRightPanelOpen(false)}
          />
        )}
      </div>

      {/* Modals & Dialogs */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          addToCart={addToCart}
        />
      )}

      {showCheckout && (
        <CheckoutPreview
          items={cartItems}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {showAdminLogin && (
        <AdminLogin
          onClose={() => setShowAdminLogin(false)}
          onLogin={(token) => {
            setAdminToken(token);
            setShowAdminLogin(false);
            setView('admin');
          }}
        />
      )}

      {toast && (
        <Toaster
          message={toast}
          onClose={() => setToast(null)}
          onViewCart={() => setRightPanelOpen(true)}
        />
      )}
    </div>
  );
}
