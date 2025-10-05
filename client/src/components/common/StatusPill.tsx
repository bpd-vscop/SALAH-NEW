import { cn } from '../../utils/cn';

interface StatusPillProps {
  label: string;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
}

const toneStyles: Record<Required<StatusPillProps>['tone'], string> = {
  default: 'bg-slate-100 text-slate-700',
  positive: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

export const StatusPill: React.FC<StatusPillProps> = ({ label, tone = 'default' }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
      toneStyles[tone]
    )}
  >
    {label}
  </span>
);
