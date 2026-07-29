import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Bot, ShoppingCart } from 'lucide-react';
import CatalogView from './lib/CatalogView';
import ChatView from './lib/ChatView';
import AdminView from './lib/AdminView';
import Cart from './lib/Cart';
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
} from './lib/api';

const tabs = [
  { id: 'catalog', label: 'Catalog', icon: Search },
  { id: 'assistant', label: 'Assistant', icon: Bot },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const isAdminAuthenticated = !!adminToken;
  const [cartItems, setCartItems] = useState([]);
  const [cartTotalItems, setCartTotalItems] = useState(0);
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ width: 0, left: 0 });

  const sessionId = useRef(getSessionId());

  const refreshCart = useCallback(async () => {
    try {
      const data = await getCart(sessionId.current);
      setCartItems(data.items || []);
      setCartTotalItems(data.total_items || 0);
    } catch (err) {
      console.error('Failed to load cart:', err);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin' || window.location.hash === '#/admin') {
        if (!adminToken) {
          setShowAdminLogin(true);
        } else {
          setActiveTab('admin');
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [adminToken]);

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

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const addToCart = async (product) => {
    try {
      await apiAddToCart(sessionId.current, product.code, 1);
      await refreshCart();
      showToast('Item added to cart');
    } catch (err) {
      console.error('Failed to add to cart:', err);
      showToast('Failed to add item to cart');
    }
  };

  const updateCartQuantity = async (code, delta) => {
    const item = cartItems.find(i => i.product_code === code);
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
    const item = cartItems.find(i => i.product_code === code);
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
    } catch (err) {
      console.error('Failed to clear cart:', err);
    }
  };

  const cartCount = cartTotalItems;

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="sticky top-0 z-30 transition-transform duration-300 ease-out" style={{ transform: visible ? 'translateY(0)' : 'translateY(-100%)' }}>
        <div className="border-b border-border-main bg-white/80 backdrop-blur-xl shadow-sm">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-2 text-base font-bold tracking-tight">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                <path d="M2 12h2l3-9 4 18 4-12 3 6h4" />
              </svg>
              <span className="text-text-primary">IMPL</span>
            </div>
            <div className="relative flex rounded-2xl bg-bg-surface p-1">
              <div className="absolute top-1 bottom-1 rounded-2xl bg-white shadow-shadow-card transition-all duration-300 ease-out" style={{ width: indicator.width, left: indicator.left }} />
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[tab.id] = el; }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                      activeTab === tab.id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsCartOpen(true)} className="relative p-1.5 text-text-muted transition-colors hover:text-text-primary">
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="flex flex-col">
        {activeTab === 'catalog' && (
          <CatalogView onSelectProduct={setSelectedProduct} addToCart={addToCart} />
        )}
        {activeTab === 'assistant' && <ChatView addToCart={addToCart} onSelectProduct={setSelectedProduct} />}
        {activeTab === 'admin' && isAdminAuthenticated && <AdminView token={adminToken} />}
      </main>

      {isCartOpen && (
        <Cart
          items={cartItems}
          total={0}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
          onCheckout={() => { setIsCartOpen(false); setShowCheckout(true); }}
        />
      )}

      {selectedProduct && (
        <ProductDetail product={selectedProduct} onClose={() => setSelectedProduct(null)} addToCart={addToCart} />
      )}

      {showCheckout && (
        <CheckoutPreview items={cartItems} total={0} onClose={() => setShowCheckout(false)} />
      )}

      {showAdminLogin && (
        <AdminLogin
          onClose={() => setShowAdminLogin(false)}
          onLogin={(token) => { setAdminToken(token); setShowAdminLogin(false); setActiveTab('admin'); }}
        />
      )}

      {toast && <Toaster message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}