import { Globe, Database, Brain, FileSearch, BarChart3, Check, CheckCircle2, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from './utils';

const ICON_MAP = {
  web: { icon: Globe, color: 'text-zinc-950', bg: 'bg-zinc-100', border: 'border-zinc-200' },
  catalog: { icon: Database, color: 'text-zinc-950', bg: 'bg-zinc-100', border: 'border-zinc-200' },
  llm: { icon: Brain, color: 'text-zinc-950', bg: 'bg-zinc-100', border: 'border-zinc-200' },
  parse: { icon: FileSearch, color: 'text-zinc-700', bg: 'bg-zinc-100', border: 'border-zinc-200' },
  rank: { icon: BarChart3, color: 'text-zinc-950', bg: 'bg-zinc-100', border: 'border-zinc-200' },
  image: { icon: ImageIcon, color: 'text-zinc-950', bg: 'bg-zinc-100', border: 'border-zinc-200' },
  check: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

export default function ProgressStep({ icon, tool, message, status, timestamp, thinking, toolArgs, toolResponse }) {
  const meta = ICON_MAP[icon] || ICON_MAP.parse;
  const IconComponent = meta.icon;

  return (
    <div className="flex items-start gap-3 py-3 text-xs">
      <div
        className={cn(
          'w-6 h-6 shrink-0 rounded-full border flex items-center justify-center mt-0.5 transition-all',
          status === 'running'
            ? 'bg-zinc-950 border-zinc-950 text-white'
            : status === 'done'
            ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
            : status === 'error'
            ? 'bg-red-50 border-red-200 text-red-600'
            : cn(meta.bg, meta.border)
        )}
      >
        {status === 'running' ? (
          <Loader2 size={11} className="animate-spin text-white" />
        ) : status === 'done' ? (
          <Check size={11} strokeWidth={2} />
        ) : status === 'error' ? (
          <X size={11} strokeWidth={2} />
        ) : (
          <IconComponent size={11} className={meta.color} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'leading-relaxed text-[13px]',
            status === 'error'
              ? 'text-red-600 font-semibold'
              : status === 'running'
              ? 'text-zinc-900 font-medium'
              : 'text-zinc-800 font-medium'
          )}
        >
          {message}
        </p>

        {toolArgs && Object.keys(toolArgs).length > 0 && (
          <div className="mt-2 mb-1 p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto shadow-inner">
            <div className="font-bold text-slate-300 mb-1 border-b border-slate-700 pb-1">Input Arguments:</div>
            {Object.entries(toolArgs).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-blue-300 font-semibold">{k}:</span>
                <span className="text-emerald-300 break-words flex-1">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        )}

        {toolResponse && (
          <div className="mt-2 mb-1 p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto shadow-sm">
            <div className="font-bold text-zinc-500 mb-1 border-b border-zinc-200 pb-1">Response Data:</div>
            {typeof toolResponse === 'string' ? (
              <div className="text-zinc-800">{toolResponse}</div>
            ) : Array.isArray(toolResponse) ? (
              <div className="space-y-1">
                <div className="text-zinc-500 italic">[{toolResponse.length} items returned]</div>
                {toolResponse.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="bg-white p-2 rounded border border-zinc-100">
                    {typeof item === 'object' && item !== null ? (
                      Object.entries(item).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-zinc-500">{k}:</span>
                          <span className="text-zinc-900 font-medium truncate flex-1" title={typeof v === 'object' ? JSON.stringify(v) : String(v)}>
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))
                    ) : (
                      String(item)
                    )}
                  </div>
                ))}
                {toolResponse.length > 3 && <div className="text-zinc-400 pl-2">...and {toolResponse.length - 3} more</div>}
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(toolResponse).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-zinc-500">{k}:</span>
                    <span className="text-zinc-900 font-medium flex-1 break-words">
                      {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {thinking && (
          <div className="mt-2 mb-1 text-zinc-500 text-[12px] leading-relaxed italic">
            {thinking}
          </div>
        )}

        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-zinc-400">
          {tool && (
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-zinc-200 text-zinc-500 flex items-center gap-1.5">
              <IconComponent size={10} />
              {tool}
            </span>
          )}
          {timestamp && <span className="font-mono">{timestamp}</span>}
        </div>
      </div>
    </div>
  );
}
