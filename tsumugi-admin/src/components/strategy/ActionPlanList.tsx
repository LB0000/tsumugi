import { useState } from 'react';
import { Play, Trash2, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import type { ActionPlan, ActionStatus, ActionPriority } from '../../types/strategy';
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS, PRIORITY_LABELS } from '../../types/strategy';
import { executeActionPlan, deleteActionPlan, updateActionPlan } from '../../api/strategy';

interface Props {
  actions: ActionPlan[];
  onRefresh: () => void;
}

const STATUS_ICONS: Record<ActionStatus, typeof CheckCircle> = {
  pending: Clock,
  in_progress: Loader2,
  completed: CheckCircle,
  failed: AlertCircle,
};

const STATUS_COLORS: Record<ActionStatus, string> = {
  pending: 'text-text-secondary',
  in_progress: 'text-blue-500 animate-spin',
  completed: 'text-emerald-500',
  failed: 'text-red-500',
};

const PRIORITY_DOTS: Record<ActionPriority, string> = {
  high: 'bg-red-400',
  medium: 'bg-yellow-400',
  low: 'bg-gray-300',
};

export function ActionPlanList({ actions, onRefresh }: Props) {
  const [executing, setExecuting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async (id: string) => {
    try {
      setExecuting(id);
      setError(null);
      await executeActionPlan(id);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '実行に失敗しました');
    } finally {
      setExecuting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このアクションを削除しますか？')) return;
    try {
      setError(null);
      await deleteActionPlan(id);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  };

  const handleToggleComplete = async (plan: ActionPlan) => {
    try {
      setError(null);
      const newStatus = plan.status === 'completed' ? 'pending' : 'completed';
      await updateActionPlan(plan.id, { status: newStatus });
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました');
    }
  };

  if (actions.length === 0) return null;

  const sorted = [...actions].sort((a, b) => {
    const statusOrder: Record<ActionStatus, number> = { in_progress: 0, pending: 1, failed: 2, completed: 3 };
    const priorityOrder: Record<ActionPriority, number> = { high: 0, medium: 1, low: 2 };
    const sd = statusOrder[a.status] - statusOrder[b.status];
    if (sd !== 0) return sd;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="mt-4 space-y-1.5">
      <p className="text-xs font-medium text-text-secondary mb-2">アクションプラン</p>
      {error && <p className="text-xs text-danger mb-1">{error}</p>}
      {sorted.map((plan) => {
        const StatusIcon = STATUS_ICONS[plan.status];
        const canExecute = plan.actionType !== 'manual' && plan.status !== 'completed' && plan.status !== 'in_progress';

        return (
          <div key={plan.id} className="flex items-center gap-2 group">
            <button onClick={() => handleToggleComplete(plan)} className="flex-shrink-0" aria-label={plan.status === 'completed' ? '未完了に戻す' : '完了にする'}>
              <StatusIcon size={16} className={STATUS_COLORS[plan.status]} />
            </button>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOTS[plan.priority]}`} title={PRIORITY_LABELS[plan.priority]} />
            <span className={`text-sm flex-1 ${plan.status === 'completed' ? 'line-through text-text-secondary' : 'text-text'}`}>
              {plan.title}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ACTION_TYPE_COLORS[plan.actionType]}`}>
              {ACTION_TYPE_LABELS[plan.actionType]}
            </span>
            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              {canExecute && (
                <button
                  onClick={() => handleExecute(plan.id)}
                  disabled={executing === plan.id}
                  className="p-1 text-primary hover:text-primary/80 disabled:opacity-50"
                  title="実行"
                >
                  {executing === plan.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                </button>
              )}
              <button onClick={() => handleDelete(plan.id)} className="p-1 text-text-secondary hover:text-danger" title="削除">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
