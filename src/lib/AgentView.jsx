import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Package, ChevronDown, CheckCircle2, Plus, X, Globe, Eye, Check, Layers, ShieldCheck, ZoomIn, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { cn } from './utils';
import { matchRequirementStream, matchImageStream, getProductImage } from './api';
import ProgressStep from './ProgressStep';
import ImageLightbox from './ImageLightbox';
import VariantSelectorModal from './VariantSelectorModal';
import HeroSection from './HeroSection';
import PromptDock from './PromptDock';

const SAMPLE_PRESETS = [
  {
    title: 'Mixer Forceps Long',
    code: 'BJ012R',
    category: 'Cardiovascular',
    fullQuery: 'MIXER FORCEPS LONG - BJ012R',
  },
  {
    title: 'DeBakey Vascular Clamp',
    code: 'FD034R',
    category: 'Cardiovascular',
    fullQuery: 'Aesculap FD034R vascular clamp curved 160mm',
  },
  {
    title: 'Cranial Plate 2.0mm',
    code: 'Straight',
    category: 'Neurosurgery',
    fullQuery: 'Low-profile titanium cranial plate 2.0mm straight',
  },
  {
    title: 'Micro Scissors',
    code: '120mm',
    category: 'Plastic',
    fullQuery: 'Titanium micro scissors sharp/blunt 120mm',
  },
];

export default function AgentView({ onIdentified, onCandidates, onSelectProduct, addToCart, initialQuery = '', restoredState = null, onSessionComplete }) {
  const [requirement, setRequirement] = useState(restoredState ? '' : (typeof initialQuery === 'string' ? initialQuery : ''));
  const [activeQuery, setActiveQuery] = useState(restoredState?.activeQuery || '');
  const [steps, setSteps] = useState(restoredState?.steps || []);
  const [identified, setIdentified] = useState(restoredState?.identified || null);
  const [candidates, setCandidates] = useState(restoredState?.candidates || []);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [timeline, setTimeline] = useState(restoredState?.timeline || []);
  const [stepsOpen, setStepsOpen] = useState(restoredState ? false : false);
  const [elapsed, setElapsed] = useState(restoredState?.elapsed || null);
  const [expandedCandidateCode, setExpandedCandidateCode] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // omitting imagePreview from restore for now since it's a blob url usually
  const [lightbox, setLightbox] = useState(null);
  const [variantModalCandidate, setVariantModalCandidate] = useState(null);

  const feedRef = useRef(null);
  const isScrolledUp = useRef(false);
  const abortRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialQuery && typeof initialQuery === 'string' && !restoredState) {
      setRequirement(initialQuery);
      runTextMatch(initialQuery);
    }
  }, [initialQuery, restoredState]);

  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    isScrolledUp.current = scrollHeight - scrollTop - clientHeight > 150;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!isScrolledUp.current) {
      feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [steps, candidates, identified, scrollToBottom]);

  const prevIsRunning = useRef(isRunning);
  useEffect(() => {
    if (prevIsRunning.current && !isRunning) {
      if (identified || candidates.length > 0) {
        onSessionComplete?.({
          activeQuery,
          steps,
          identified,
          candidates,
          timeline,
          elapsed,
          timestamp: Date.now()
        });
      }
    }
    prevIsRunning.current = isRunning;
  }, [isRunning, activeQuery, steps, identified, candidates, timeline, elapsed, onSessionComplete]);

  const stopRunning = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (startTimeRef.current) {
      setElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
    }
  }, []);

  const runTextMatch = (queryText) => {
    const val = (queryText || requirement).trim();
    if (!val || isRunning) return;
    setActiveQuery(val);
    setSteps([]);
    setIdentified(null);
    setCandidates([]);
    setError(null);
    setTimeline([]);
    setStepsOpen(false); // Collapsed by default per user request
    setIsRunning(true);
    setElapsed(null);
    setImagePreview(null);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(1)), 100);

    abortRef.current = matchRequirementStream(val, (event) => {
      switch (event.type) {
        case 'tool_response':
        case 'tool_call':
        case 'progress': {
          setSteps((prev) => {
            const updated = prev.map((s) => (s.status === 'running' ? { ...s, status: 'done' } : s));
            
            let rawThinking = event.thinking || event.reasoning || event.explanation || '';
            if (rawThinking.includes('Parsed codes & extracted type')) {
              rawThinking = '';
            }
            
            const lastStep = updated[updated.length - 1];
            // Only show thinking if it's different from the immediately preceding step
            const shouldShowThinking = rawThinking && (!lastStep || lastStep.thinking !== rawThinking);

            let msg = event.message || 'Processing...';
            if (typeof msg === 'object') {
              msg = msg.message || JSON.stringify(msg);
            }
            if (event.type === 'tool_call' && !event.message) msg = `Calling ${event.tool}`;
            
            if (event.type === 'tool_response') {
              if (typeof event.response === 'string') {
                msg = event.response;
              } else if (!event.message) {
                msg = `Response from ${event.tool}`;
              }
            }

            updated.push({
              icon: event.icon || (event.type === 'tool_call' ? 'llm' : event.type === 'tool_response' ? 'check' : 'catalog'),
              tool: event.tool || '',
              message: msg,
              thinking: shouldShowThinking ? rawThinking : '',
              toolArgs: event.type === 'tool_call' ? event.arguments : null,
              toolResponse: (event.type === 'tool_response' && typeof event.response === 'object' && event.response !== null) ? event.response : null,
              status: 'running',
            });
            return updated;
          });
          break;
        }
        case 'identified': {
          setIdentified(event.identified || event.product || event);
          setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'done' } : s)));
          break;
        }
        case 'candidates':
        case 'recommend': {
          const list = event.candidates || [];
          setCandidates(list);
          if (list.length > 0) setExpandedCandidateCode(list[0]?.product?.code || list[0]?.code);
          setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'done' } : s)));
          break;
        }
        case 'timeline':
          setTimeline(event.steps || event.timeline || []);
          break;
        case 'done':
          setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'done' } : s)));
          stopRunning();
          break;
        case 'error':
          setError(typeof event.message === 'object' ? (event.message.message || JSON.stringify(event.message)) : (event.message || 'Matching failed.'));
          stopRunning();
          setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'error' } : s)));
          break;
      }
    });
  };

  const handleImageSearch = (file) => {
    if (!file || isRunning) return;
    setError(null);
    setSteps([]);
    setIdentified(null);
    setCandidates([]);
    setTimeline([]);
    setStepsOpen(false); // Collapsed by default
    setIsRunning(true);
    setElapsed(null);
    setImagePreview((old) => { if (old) URL.revokeObjectURL(old); return null; });
    
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setActiveQuery('Visual Match: ' + file.name);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(1)), 100);

    abortRef.current = matchImageStream(file, (event) => {
      switch (event.type) {
        case 'tool_response':
        case 'tool_call':
        case 'progress': {
          setSteps((prev) => {
            const updated = prev.map((s) => (s.status === 'running' ? { ...s, status: 'done' } : s));
            
            let rawThinking = event.thinking || event.reasoning || event.explanation || '';
            if (rawThinking.includes('Parsed codes & extracted type')) {
              rawThinking = '';
            }
            
            const lastStep = updated[updated.length - 1];
            const shouldShowThinking = rawThinking && (!lastStep || lastStep.thinking !== rawThinking);

            let msg = event.message || 'Processing...';
            if (event.type === 'tool_call' && !event.message) msg = `Calling ${event.tool}`;
            
            if (event.type === 'tool_response') {
              if (typeof event.response === 'string') {
                msg = event.response;
              } else if (!event.message) {
                msg = `Response from ${event.tool}`;
              }
            }

            updated.push({
              icon: event.icon || (event.type === 'tool_call' ? 'llm' : event.type === 'tool_response' ? 'check' : 'image'),
              tool: event.tool || 'visual_embedding',
              message: msg,
              thinking: shouldShowThinking ? rawThinking : '',
              toolArgs: event.type === 'tool_call' ? event.arguments : null,
              toolResponse: (event.type === 'tool_response' && typeof event.response === 'object' && event.response !== null) ? event.response : null,
              status: 'running',
            });
            return updated;
          });
          break;
        }
        case 'identified':
          setIdentified(event.identified || event.product || event);
          break;
        case 'candidates':
        case 'recommend':
          setCandidates(event.candidates || []);
          if (event.candidates?.length > 0) setExpandedCandidateCode(event.candidates[0]?.product?.code || event.candidates[0]?.code);
          break;
        case 'timeline':
          setTimeline(event.steps || event.timeline || []);
          break;
        case 'done':
          setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'done' } : s)));
          stopRunning();
          break;
        case 'error':
          setError(typeof event.message === 'object' ? (event.message.message || JSON.stringify(event.message)) : (event.message || 'Image match failed'));
          stopRunning();
          break;
      }
    });
  };

  const hasResult = identified || candidates.length > 0;
  const showConversation = activeQuery || steps.length > 0 || hasResult || isRunning;
    const getCompetitorContext = (cand) => {
    if (!identified) return undefined;
    return {
      competitor_code: identified.code || undefined,
      competitor_name: identified.product_type || identified.name || undefined,
      competitor_manufacturer: identified.manufacturer || undefined,
      match_percent: cand?.match_percent ?? undefined,
    };
  };

  const handleSelectProduct = (p, cand) => {
    if (!onSelectProduct) return;
    onSelectProduct({
      ...p,
      match_percent: cand?.match_percent ?? p.match_percent,
      _competitorContext: getCompetitorContext(cand)
    });
  };
  const dockProps = {
    requirement, onRequirementChange: setRequirement, isRunning,
    onSubmit: () => { if (requirement.trim() && !isRunning) { runTextMatch(requirement); setRequirement(''); } },
    onStop: () => { abortRef.current?.(); stopRunning(); },
    onAttach: (file) => file instanceof File ? handleImageSearch(file) : fileInputRef.current?.click(),
    imagePreview, onClearImage: () => setImagePreview(null),
  };

  useEffect(() => {
    return () => { 
      abortRef.current?.(); 
      if (timerRef.current) clearInterval(timerRef.current); 
      setImagePreview(old => { if (old) URL.revokeObjectURL(old); return null; });
    };
  }, []);

  return (
    <div className="flex h-full flex-col text-zinc-900 relative overflow-hidden bg-[var(--color-bg)]">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImageSearch(f); }} />

      {!showConversation && !error ? (
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 sm:p-8 pt-[5vh] pb-[10vh]">
          <HeroSection />
          
          {/* Centered Prompt Dock for Empty State */}
          <div className="w-full max-w-3xl mt-8 relative z-20">
            <PromptDock {...dockProps} />
          </div>

          <div className="max-w-3xl mx-auto w-full mt-10">
            <div className="grid grid-cols-2 gap-4">
              {SAMPLE_PRESETS.map((item) => (
                <button
                  key={item.fullQuery}
                  onClick={() => { setRequirement(''); runTextMatch(item.fullQuery); }}
                  className="p-4 agentic-card text-left flex items-start justify-between group cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                      {item.category} • {item.code}
                    </span>
                    <p className="font-semibold text-[14px] text-[var(--color-text)] group-hover:text-black transition-colors">{item.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full w-full">
          <div ref={feedRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 py-8 space-y-6">
            <div className="mx-auto max-w-3xl space-y-8">
              
              {/* User Query Bubble */}
              {activeQuery && (
                <div className="flex justify-end">
                  <div className="max-w-xl rounded-3xl bg-slate-800 text-white px-6 py-4 shadow-md">
                    {imagePreview && <img src={imagePreview} alt="Uploaded" className="max-h-40 rounded-xl object-contain mb-3 bg-white/10 border border-slate-700" />}
                    <p className="text-[16px] leading-relaxed font-medium">{activeQuery}</p>
                  </div>
                </div>
              )}

            {/* Agent Responses Container */}
            <div className="flex items-start gap-4">
              {/* Agent Avatar */}
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-1">
                KM
              </div>

              <div className="flex-1 space-y-4">
                
                {/* Gemini-like Thinking Process */}
                {steps.length > 0 && (
                  <div className="agentic-card overflow-hidden bg-white border border-zinc-200 rounded-2xl shadow-sm">
                    <button onClick={() => setStepsOpen(!stepsOpen)} className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-zinc-50/80 cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isRunning ? (
                          <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600">
                            <Loader2 size={14} className="animate-spin" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-zinc-600">
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-[13px] font-bold text-zinc-900">
                            {isRunning ? 'Agent thinking...' : 'Thought process'}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-medium truncate">
                            {isRunning ? `Running step ${steps.length} • ${steps[steps.length-1]?.tool || 'analyzing'}` : `${steps.length} completed actions in ${elapsed || '0.0'}s`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {elapsed && <span className="font-mono text-[11px] text-zinc-400 font-medium">{elapsed}s</span>}
                        <ChevronDown size={16} className={cn('text-zinc-400 transition-transform duration-300', !stepsOpen && '-rotate-90')} />
                      </div>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {stepsOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-zinc-100 bg-zinc-50/40 overflow-hidden"
                        >
                          <div className="px-4 py-2 relative">
                            {/* Vertical Timeline Line */}
                            <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-zinc-200 z-0"></div>
                            
                            <div className="relative z-10 flex flex-col">
                              {steps.map((s, i) => <ProgressStep key={i} {...s} />)}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Identified Ref */}
                {identified && (
                  <div className="agentic-card p-5 space-y-4 bg-zinc-50 border border-zinc-200 shadow-sm rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="flex items-center gap-2 pb-3 border-b border-zinc-200">
                      <Globe size={16} className="text-blue-500" />
                      <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-700">Online Research Target</span>
                      {identified.manufacturer && (
                        <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded bg-zinc-200 text-zinc-700 uppercase">
                          {identified.manufacturer}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-4">
                      {identified.images?.[0] && (
                        <img src={identified.images[0]} alt="Ref" className="w-24 h-24 rounded-lg object-contain bg-white border border-zinc-200 p-1 shadow-sm" />
                      )}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-zinc-900 leading-tight">{identified.product_type || identified.name}</h3>
                          {identified.code && <span className="font-mono text-[12px] font-bold text-zinc-700 bg-white border border-zinc-200 px-2 py-0.5 rounded shadow-sm">{identified.code}</span>}
                        </div>
                        {identified.summary && <p className="text-[14px] text-zinc-600 leading-relaxed">{identified.summary}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Candidates Grid */}
                {candidates.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 px-1">
                      <Package size={16} className="text-zinc-500" />
                      <h3 className="text-[13px] font-bold text-zinc-700 uppercase tracking-wider">Recommended Catalog Equivalents</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {candidates.map((cand, idx) => {
                        const p = cand.product || cand;
                        const matchPercent = Math.round(cand.match_percent ?? 90);

                        return (
                          <div key={p.code} className="agentic-card flex flex-col bg-white border border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all rounded-2xl overflow-hidden group">
                            
                            {/* Card Header */}
                            <div className="p-4 flex gap-4 items-start border-b border-zinc-100 bg-zinc-50/50">
                              <button onClick={() => handleSelectProduct(p, cand)} className="w-16 h-16 shrink-0 rounded bg-white border border-zinc-200 flex items-center justify-center p-1 hover:border-blue-400 transition-all cursor-pointer">
                                {p.has_image ? <img src={getProductImage(p.code)} className="w-full h-full object-contain" /> : <Package className="text-zinc-300" />}
                              </button>
                              
                              <div className="flex-1 min-w-0 space-y-1 mt-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <button onClick={() => handleSelectProduct(p, cand)} className="font-mono text-[12px] font-bold bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded hover:bg-zinc-300 transition-colors">{p.code}</button>
                                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", matchPercent === 100 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
                                    {matchPercent}% Match
                                  </span>
                                </div>
                                <button onClick={() => handleSelectProduct(p, cand)} className="font-semibold text-[14px] text-zinc-900 text-left hover:text-blue-600 line-clamp-2 leading-snug">
                                  {p.name}
                                </button>
                              </div>
                            </div>

                            {/* Card Body (Rationale & Specs) */}
                            <div className="p-4 flex-1 flex flex-col gap-3">
                              {cand.reason && (
                                <p className="text-[12px] text-zinc-600 leading-relaxed italic border-l-2 border-zinc-200 pl-2">
                                  {cand.reason}
                                </p>
                              )}
                              
                              {cand.spec_table?.length > 0 && (
                                <div className="mt-2 text-[11px] space-y-1">
                                  {cand.spec_table.slice(0, 3).map((row, ri) => (
                                    <div key={ri} className="flex justify-between items-center bg-zinc-50 px-2 py-1 rounded">
                                      <span className="text-zinc-500 font-medium">{row.property}</span>
                                      <span className="text-zinc-900 font-mono font-bold flex items-center gap-1">
                                        {row.impl} {row.match && <Check size={10} className="text-emerald-500" />}
                                      </span>
                                    </div>
                                  ))}
                                  {cand.spec_table.length > 3 && (
                                    <div className="text-center text-zinc-400 text-[10px] pt-1">+{cand.spec_table.length - 3} more specs</div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Card Footer (Actions) */}
                            <div className="p-3 border-t border-zinc-100 bg-white">
                              {cand.family_count > 1 ? (
                                <button onClick={() => setVariantModalCandidate(cand)} className="w-full py-2.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors text-[13px] font-semibold flex items-center justify-center gap-2">
                                  <SlidersHorizontal size={14} /><span>Select Size ({cand.family_count})</span>
                                </button>
                              ) : (
                                <button onClick={() => addToCart?.(p, getCompetitorContext(cand))} className="w-full py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm">
                                  <Plus size={14} /><span>Add to Tray</span>
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          
          {/* Input Dock for Active State */}
          <div className="p-4 shrink-0 bg-transparent relative z-10 w-full">
            <div className="max-w-3xl mx-auto w-full">
              <PromptDock {...dockProps} />
            </div>
          </div>
        </div>
      )}

      {variantModalCandidate && <VariantSelectorModal candidate={variantModalCandidate} onClose={() => setVariantModalCandidate(null)} onSelectVariant={(v) => { addToCart?.(v, getCompetitorContext(variantModalCandidate)); setVariantModalCandidate(null); }} />}
      {lightbox && <ImageLightbox {...lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
