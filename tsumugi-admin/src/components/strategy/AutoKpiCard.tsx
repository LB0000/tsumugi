import { RefreshCw } from 'lucide-react';
import type { GoalWithAutoKpi } from '../../types/strategy';

interface Props {
  goal: GoalWithAutoKpi;
}

export function AutoKpiCard({ goal }: Props) {
  const { autoKpi } = goal;
  if (!autoKpi || autoKpi.autoValue === null) return null;

  const pct = goal.targetValue > 0
    ? Math.min(Math.round((autoKpi.autoValue / goal.targetValue) * 100), 100)
    : 0;

  const diff = autoKpi.autoValue - goal.currentValue;
  const diffLabel = diff > 0 ? `+${diff.toLocaleString()}` : diff < 0 ? `${diff.toLocaleString()}` : '±0';

  return (
    <div className="mt-3 bg-primary/5 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <RefreshCw size={12} className="text-primary" />
          <span className="text-xs text-text-secondary">自動計測</span>
        </div>
        <span className="text-xs text-text-secondary">{autoKpi.source}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-lg font-bold text-primary">{autoKpi.autoValue.toLocaleString()}</span>
        <span className="text-xs text-text-secondary">/ {goal.targetValue.toLocaleString()} {goal.unit}</span>
        {diff !== 0 && (
          <span className={`text-xs font-medium ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            (手動値との差: {diffLabel})
          </span>
        )}
      </div>
      <div className="w-full bg-primary/10 rounded-full h-1.5 mt-1.5">
        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
