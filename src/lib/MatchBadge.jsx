import { cn } from './utils';

const SIZES = {
  xs: 'px-1.5 py-0.5 text-[9.5px]',
  sm: 'px-2 py-0.5 text-[10.5px]',
  md: 'px-2.5 py-1 text-[11.5px]',
};

export function MatchBadge({ percent, size = 'sm', className }) {
  if (percent == null) return null;
  const pct = Math.round(Number(percent));
  const tone =
    pct >= 90
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : pct >= 70
      ? 'bg-zinc-950 text-white border-zinc-950'
      : 'bg-zinc-100 text-zinc-600 border border-zinc-200';
  const label = pct >= 100 ? '100% Match' : `${pct}% Fit`;

  return (
    <span className={cn('inline-flex items-center rounded-full font-mono font-bold leading-none', SIZES[size], tone, className)}>
      {label}
    </span>
  );
}

export function confidenceLabel(conf) {
  switch (conf) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
    case 'low-evidence':
      return 'Weak evidence';
    case 'no-evidence':
      return 'No evidence';
    default:
      return typeof conf === 'string' && conf ? conf : '';
  }
}
