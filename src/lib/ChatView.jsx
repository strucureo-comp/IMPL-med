import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, X, Send, Paperclip, User, Bot, Image as ImageIcon, ChevronLeft, ChevronRight, Layers, Search } from 'lucide-react';
import { cn } from './utils';
import { marked } from 'marked';
import {
  streamChat,
  streamChatImage,
  getConversations,
  createConversation,
  deleteConversation,
  getConversationMessages,
  getProductImage,
  searchProducts,
} from './api';

const suggestions = [
  'What neurosurgery instruments do you have?',
  'Show me cardio products',
  'Compare cranial plates',
];

export default function ChatView({ addToCart, onSelectProduct }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [error, setError] = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [showProducts, setShowProducts] = useState(false);
  const [panelProducts, setPanelProducts] = useState([]);
  const [productHistory, setProductHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);
  const streamRef = useRef('');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamContent, scrollToBottom]);

  const resolveMessageImage = (msg) => {
    if (msg.image_url) return { src: msg.image_url };
    if (msg.image_filename) return { src: `/api/chat/images/${msg.image_filename}` };
    return null;
  };

  const navigateProductHistory = (dir) => {
    const newIndex = historyIndex + dir;
    if (newIndex >= 0 && newIndex < productHistory.length) {
      setHistoryIndex(newIndex);
      setPanelProducts(productHistory[newIndex]);
    }
  };

  const handleShowSimilar = async (product) => {
    setIsSearchingSimilar(true);
    try {
      const query = [product.name, product.description, product.specifications?.Author, product.specifications?.['Total length'], product.specialty].filter(Boolean).join(' ');
      const data = await searchProducts({ query, page: 1 });
      const similar = (data.products || []).filter(p => p.code !== product.code);
      if (similar.length > 0) {
        setPanelProducts(similar);
        setShowProducts(true);
        setProductHistory(prev => {
          const next = [...prev, similar];
          setHistoryIndex(next.length - 1);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to find similar products:', err);
    } finally {
      setIsSearchingSimilar(false);
    }
  };

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const startNewChat = async () => {
    try {
      const data = await createConversation();
      setActiveConversation(data.id);
      setMessages([]);
      setShowLanding(true);
      setError(null);
      setAttachedImage(null);
      setShowProducts(false);
      setPanelProducts([]);
      setProductHistory([]);
      setHistoryIndex(-1);
      await loadConversations();
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectConversation = async (conv) => {
    setActiveConversation(conv.id);
    setShowLanding(false);
    setError(null);
    setAttachedImage(null);
    setSidebarOpen(false);
    setProductHistory([]);
    setHistoryIndex(-1);
    try {
      const data = await getConversationMessages(conv.id);
      const msgs = data.messages || [];
      setMessages(msgs);
      const assistantMsgsWithProducts = msgs.filter(m => m.role === 'assistant' && m.products?.length);
      if (assistantMsgsWithProducts.length > 0) {
        const lastProducts = assistantMsgsWithProducts[assistantMsgsWithProducts.length - 1].products;
        setPanelProducts(lastProducts);
        setShowProducts(true);
        setProductHistory(assistantMsgsWithProducts.map(m => m.products));
        setHistoryIndex(assistantMsgsWithProducts.length - 1);
      } else {
        setPanelProducts([]);
        setShowProducts(false);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      if (activeConversation === id) {
        setActiveConversation(null);
        setMessages([]);
        setShowLanding(true);
      }
      await loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !attachedImage) || isStreaming) return;
    const message = inputValue.trim();
    setInputValue('');
    setError(null);

    const userMsg = { role: 'user', content: message };
    if (attachedImage) {
      userMsg.image_url = attachedImage.url;
    }
    setMessages(prev => [...prev, userMsg]);
    setShowLanding(false);
    setIsStreaming(true);
    streamRef.current = '';
    setStreamContent('');
    setShowProducts(false);

    if (!activeConversation) {
      try {
        const data = await createConversation(message || '(image)');
        setActiveConversation(data.id);
        await loadConversations();
      } catch (err) {
        console.error('Failed to create conversation:', err);
      }
    }

    const imageFile = attachedImage?.file;
    setAttachedImage(null);

    const onEvent = (event) => {
      switch (event.type) {
        case 'start':
          break;
        case 'token':
          streamRef.current += (event.content || '');
          setStreamContent(streamRef.current);
          break;
        case 'reset_tokens':
          streamRef.current = '';
          setStreamContent('');
          break;
        case 'products':
          setPanelProducts(event.products || []);
          setShowProducts(true);
          setProductHistory(prev => {
            const next = [...prev, event.products || []];
            setHistoryIndex(next.length - 1);
            return next;
          });
          break;
        case 'done': {
          const finalContent = event.full_content || streamRef.current;
          setMessages(prev => [...prev, { role: 'assistant', content: finalContent }]);
          streamRef.current = '';
          setStreamContent('');
          setIsStreaming(false);
          abortRef.current = null;
          break;
        }
        case 'perf':
          break;
        case 'error':
          setError(event.content || event.data);
          setIsStreaming(false);
          streamRef.current = '';
          setStreamContent('');
          break;
      }
    };

    if (imageFile) {
      abortRef.current = streamChatImage(activeConversation, imageFile, message, onEvent);
    } else {
      abortRef.current = streamChat(activeConversation, message, onEvent);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAttachedImage({ file, url });
    e.target.value = '';
  };

  const handleAttachImage = () => fileInputRef.current?.click();
  const removeAttachedImage = () => {
    if (attachedImage?.url) URL.revokeObjectURL(attachedImage.url);
    setAttachedImage(null);
  };

  useEffect(() => {
    return () => abortRef.current?.();
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-stone-50">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Sidebar */}
      <div className="relative flex">
        <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pointer-events-none">
          {!sidebarOpen && (
            <div className="w-5 h-10 bg-white border border-l-0 border-stone-200 rounded-r-xl shadow-sm flex items-center justify-center text-stone-400 transition-all duration-300 pointer-events-auto cursor-pointer hover:text-stone-600" onClick={() => setSidebarOpen(true)}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2L7 5L4 8" />
              </svg>
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex flex-col bg-white border-r border-stone-200 transition-all duration-300 ease-out overflow-hidden shrink-0",
            sidebarOpen ? 'w-64' : 'w-0'
          )}
        >
          <div className="w-64 min-w-0 pl-3">
            <div className="pr-3 pt-4 pb-2 flex items-center justify-between">
              <button
                onClick={startNewChat}
                className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-medium transition-all"
              >
                <Plus size={16} />
                New Chat
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 transition-all ml-2"
              >
                <X size={14} />
              </button>
            </div>
            <div className="overflow-y-auto pr-3 pb-3 space-y-1" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
              <p className="px-2 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">Conversations</p>
              {conversations.map((conv) => (
                <div key={conv.id} className="group flex items-center">
                  <button
                    onClick={() => { handleSelectConversation(conv); setSidebarOpen(false); }}
                    className={cn(
                      'flex-1 text-left px-3 py-2.5 rounded-2xl text-sm transition-all truncate',
                      activeConversation === conv.id && !showLanding
                        ? 'bg-brand/10 text-brand font-medium'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                    )}
                  >
                    {conv.title || 'New Chat'}
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-stone-400 hover:text-red-500 transition-all mr-1 shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-w-0 relative">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header bar */}
          {!showLanding && (
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-stone-200 bg-white">
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 truncate">
                  {conversations.find(c => c.id === activeConversation)?.title || 'New Chat'}
                </p>
              </div>
              <button
                onClick={startNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-100 transition-all"
              >
                <Plus size={14} />
                New Chat
              </button>
            </div>
          )}

          {showLanding ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
              <div className="w-full max-w-xl mx-auto flex flex-col items-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center mb-6 shadow-glow">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M2 12h2l3-9 4 18 4-12 3 6h4" />
                  </svg>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 text-center mb-2">
                  How can I help you?
                </h1>
                <p className="text-sm text-stone-500 text-center mb-8">
                  Ask about any surgical product in our catalog
                </p>

                <div className="relative w-full group mb-6 rounded-2xl">
                  <div className={cn(
                    "glow-ring transition-opacity duration-500",
                    inputValue.trim() ? "opacity-100 glow-ring-active" : "opacity-0 group-focus-within:opacity-100"
                  )} />
                  <div className="relative bg-white rounded-2xl border border-stone-200 px-5 py-3.5 shadow-sm transition-all duration-300 group-focus-within:border-brand/40 group-focus-within:shadow-[0_0_0_1px_rgba(200,16,46,0.12),0_4px_24px_-8px_rgba(0,0,0,0.15)]">
                    {attachedImage && (
                      <div className="mb-2 inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl p-1 pr-2">
                        <img src={attachedImage.url} alt="To send" className="h-12 w-12 object-cover rounded-lg" />
                        <button onClick={removeAttachedImage} className="p-0.5 rounded-md text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all" aria-label="Remove image">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center">
                      <button onClick={handleAttachImage} disabled={isStreaming} className="shrink-0 p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all disabled:opacity-50" aria-label="Attach image" title="Attach an image to search">
                        <Paperclip size={18} />
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={attachedImage ? "Add a question (optional)..." : "Ask about our products..."}
                        className="flex-1 bg-transparent text-sm text-stone-900 placeholder-stone-400 outline-none ml-1"
                      />
                      <button
                        onClick={handleSend}
                        disabled={(!inputValue.trim() && !attachedImage) || isStreaming}
                        className={cn(
                          'p-2 rounded-xl transition-all ml-1',
                          (inputValue.trim() || attachedImage) && !isStreaming
                            ? 'bg-brand hover:bg-brand-hover text-white shadow-sm'
                            : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        )}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInputValue(s); inputRef.current?.focus(); }}
                      className="px-4 py-2 rounded-full border border-stone-200 text-sm text-stone-600 hover:border-stone-300 hover:text-stone-800 hover:bg-white transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
                  {messages.map((msg, i) => {
                    const userImg = msg.role === 'user' ? resolveMessageImage(msg) : null;
                    return msg.role === 'user' ? (
                      <div key={i} className="flex justify-end gap-3">
                        <div className="max-w-[70%] px-5 py-3 rounded-3xl bg-brand text-white text-sm leading-relaxed shadow-sm">
                          {userImg && (
                            <img src={userImg.src} alt="Attached" className="mb-2 rounded-xl max-h-48 max-w-full object-contain bg-white/10" />
                          )}
                          {msg.content && <div>{msg.content}</div>}
                        </div>
                        <div className="w-8 h-8 mt-1 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                          <User size={14} className="text-stone-500" />
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 mt-1 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shrink-0 text-white shadow-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h2l3-9 4 18 4-12 3 6h4" /></svg>
                        </div>
                        <div className="max-w-[85%] min-w-0">
                          <div
                            className="chat-message px-5 py-3.5 rounded-3xl bg-white text-stone-800 text-sm leading-relaxed shadow-sm border border-stone-100"
                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || '') }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {isStreaming && streamContent && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 mt-1 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shrink-0 text-white shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h2l3-9 4 18 4-12 3 6h4" /></svg>
                      </div>
                      <div className="max-w-[85%] min-w-0">
                        <div
                          className="chat-message px-5 py-3.5 rounded-3xl bg-white text-stone-800 text-sm leading-relaxed shadow-sm border border-stone-100"
                          dangerouslySetInnerHTML={{ __html: marked.parse(streamContent) }}
                        />
                      </div>
                    </div>
                  )}

                  {isStreaming && !streamContent && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 mt-1 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shrink-0 text-white shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h2l3-9 4 18 4-12 3 6h4" /></svg>
                      </div>
                      <div className="px-5 py-3.5 rounded-3xl bg-white border border-stone-100 shadow-sm">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 mt-1 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                        <X size={14} className="text-white" />
                      </div>
                      <div className="px-5 py-3 rounded-3xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="border-t border-stone-200 bg-white">
                <div className="mx-auto max-w-3xl px-4 py-4">
                  <div className="relative group rounded-2xl">
                    <div className={cn(
                      "glow-ring transition-opacity duration-500",
                      inputValue.trim() ? "opacity-100 glow-ring-active" : "opacity-0 group-focus-within:opacity-100"
                    )} />
                    <div className="relative bg-white rounded-2xl border border-stone-200 px-4 py-2.5 transition-all duration-300 group-focus-within:border-brand/40 group-focus-within:shadow-[0_0_0_1px_rgba(200,16,46,0.12),0_0_24px_-8px_rgba(200,16,46,0.3)] hover:border-stone-300">
                      {attachedImage && (
                        <div className="mb-2 inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl p-1 pr-2">
                          <img src={attachedImage.url} alt="To send" className="h-12 w-12 object-cover rounded-lg" />
                          <button onClick={removeAttachedImage} className="p-0.5 rounded-md text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all" aria-label="Remove image">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button onClick={handleAttachImage} disabled={isStreaming} className="shrink-0 p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all disabled:opacity-50" aria-label="Attach image" title="Attach an image to search">
                          <Paperclip size={18} />
                        </button>
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                          placeholder={attachedImage ? "Add a question (optional)..." : "Ask about our products..."}
                          disabled={isStreaming}
                          className="flex-1 bg-transparent text-sm text-stone-900 placeholder-stone-400 outline-none disabled:opacity-50"
                        />
                        <button
                          onClick={handleSend}
                          disabled={(!inputValue.trim() && !attachedImage) || isStreaming}
                          className={cn(
                            'p-2 rounded-xl transition-all',
                            (inputValue.trim() || attachedImage) && !isStreaming
                              ? 'bg-brand hover:bg-brand-hover text-white shadow-sm'
                              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                          )}
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right product panel */}
        <div className={cn(
          'border-l border-stone-200 bg-white transition-all duration-300 overflow-hidden',
          showProducts && !showLanding ? 'w-[340px]' : 'w-0'
        )}>
          {showProducts && !showLanding && (
            <div className="w-[340px] h-full flex flex-col">
              {/* Header with history nav */}
              <div className="shrink-0 border-b border-stone-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-sm text-stone-800 truncate">Recommended Products</h3>
                    {productHistory.length > 1 && (
                      <span className="text-[10px] text-stone-400 font-mono shrink-0">{historyIndex + 1}/{productHistory.length}</span>
                    )}
                  </div>
                  <button onClick={() => setShowProducts(false)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 transition-all">
                    <X size={14} />
                  </button>
                </div>
                {productHistory.length > 1 && (
                  <div className="flex items-center gap-1 px-4 pb-2">
                    <button
                      onClick={() => navigateProductHistory(-1)}
                      disabled={historyIndex <= 0}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
                        historyIndex > 0 ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'text-stone-300 cursor-not-allowed'
                      )}
                    >
                      <ChevronLeft size={12} /> Back
                    </button>
                    <button
                      onClick={() => navigateProductHistory(1)}
                      disabled={historyIndex >= productHistory.length - 1}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
                        historyIndex < productHistory.length - 1 ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'text-stone-300 cursor-not-allowed'
                      )}
                    >
                      Forward <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Product list */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-2.5">
                  {panelProducts.map((product) => (
                    <div
                      key={product.code}
                      onClick={() => onSelectProduct?.(product)}
                      className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-brand/30 hover:shadow-sm transition-all group flex flex-col cursor-pointer"
                    >
                      <div className="aspect-square bg-stone-50 flex items-center justify-center overflow-hidden p-2">
                        {product.has_image ? (
                          <img src={getProductImage(product.code)} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
                            <Bot size={18} className="text-stone-300" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 flex flex-col flex-1">
                        <h4 className="text-[11px] font-semibold text-stone-800 leading-tight line-clamp-2 min-h-[28px]">{product.name}</h4>
                        <p className="text-[10px] text-stone-400 mt-0.5 font-mono">{product.code}</p>
                        {product.specifications && typeof product.specifications === 'object' && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {Object.entries(product.specifications).slice(0, 2).map(([k, v]) => (
                              <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 leading-none">{v}</span>
                            ))}
                          </div>
                        )}
                        {product.specialty && (
                          <span className="inline-block mt-1.5 text-[9px] font-medium text-brand">{product.specialty}</span>
                        )}
                        <div className="mt-auto pt-2 flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShowSimilar(product); }}
                            disabled={isSearchingSimilar}
                            className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-medium bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100 hover:text-stone-800 transition-all disabled:opacity-50"
                            title="Show similar products"
                          >
                            <Layers size={10} /> Similar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            className="flex-1 px-1.5 py-1.5 rounded-lg text-[10px] font-medium bg-stone-50 text-stone-700 border border-stone-200 hover:bg-brand hover:text-white hover:border-brand transition-all"
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {panelProducts.length === 0 && (
                  <div className="text-center py-8 text-stone-400 text-xs">
                    <Search size={24} className="mx-auto mb-2 text-stone-300" />
                    <p>No products found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}