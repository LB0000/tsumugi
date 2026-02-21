import { useState, useEffect, useCallback } from 'react';
import { Target, Plus, TrendingUp, DollarSign, Trash2, Pencil, ArrowRight, Calendar, Clock, RefreshCw } from 'lucide-react';
import {
  type GoalWithAutoKpi, type AdSpend, type CacSummary, type FunnelConversionRates, type FunnelSnapshot, type ActionPlan, type ActionType,
  CATEGORY_LABELS, CATEGORY_BADGE_COLORS, CHANNEL_LABELS, CHANNEL_BADGE_COLORS,
  type GoalCategory, type AdChannel,
} from '../types/strategy';
import {
  getGoals, createGoal, deleteGoal, updateGoalProgress,
  getAdSpends, createAdSpend, deleteAdSpend,
  getFunnelSnapshots, createFunnelSnapshot,
  getActionPlans, createActionPlan,
} from '../api/strategy';
import { getFunnelSyncStatus, triggerFunnelSync } from '../api/settings';
import { GoalForm } from '../components/strategy/GoalForm';
import { AdSpendForm } from '../components/strategy/AdSpendForm';
import { FunnelForm } from '../components/strategy/FunnelForm';
import { AutoKpiCard } from '../components/strategy/AutoKpiCard';
import { QuickActions } from '../components/strategy/QuickActions';
import { ActionPlanList } from '../components/strategy/ActionPlanList';
import { ActionPlanForm } from '../components/strategy/ActionPlanForm';

export function StrategyPage() {
  const [goals, setGoals] = useState<GoalWithAutoKpi[]>([]);
  const [actionsByGoal, setActionsByGoal] = useState<Record<string, ActionPlan[]>>({});
  const [spends, setSpends] = useState<AdSpend[]>([]);
  const [cacSummary, setCacSummary] = useState<CacSummary>({ totalSpend: 0, totalConversions: 0, avgCac: 0, totalRevenue: 0, roas: 0 });
  const [funnelRates, setFunnelRates] = useState<FunnelConversionRates>({ visitToFree: 0, freeToCharge: 0, chargeToPurchase: 0, visitToPurchase: 0 });
  const [funnelSnapshots, setFunnelSnapshots] = useState<FunnelSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showAdSpendForm, setShowAdSpendForm] = useState(false);
  const [showFunnelForm, setShowFunnelForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Action plan form state
  const [actionFormGoalId, setActionFormGoalId] = useState<string | null>(null);
  const [actionFormDefaultType, setActionFormDefaultType] = useState<ActionType | undefined>();
  const [actionFormDefaultTitle, setActionFormDefaultTitle] = useState<string | undefined>();
  const [lastFunnelSync, setLastFunnelSync] = useState<string | null>(null);
  const [funnelSyncing, setFunnelSyncing] = useState(false);
  const [funnelSyncMsg, setFunnelSyncMsg] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [goalsRes, spendsRes, funnelRes, actionsRes] = await Promise.all([
        getGoals(), getAdSpends(), getFunnelSnapshots(), getActionPlans(),
      ]);
      setGoals(goalsRes.goals);
      setSpends(spendsRes.spends);
      setCacSummary(spendsRes.summary);
      setFunnelSnapshots(funnelRes.snapshots);
      setFunnelRates(funnelRes.conversionRates);

      // Group actions by goalId
      const grouped: Record<string, ActionPlan[]> = {};
      for (const action of actionsRes.actions) {
        if (!grouped[action.goalId]) grouped[action.goalId] = [];
        grouped[action.goalId].push(action);
      }
      setActionsByGoal(grouped);

      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    getFunnelSyncStatus()
      .then((res) => setLastFunnelSync(res.lastSync))
      .catch(() => {/* ignore */});
  }, []);

  const handleFunnelSync = async () => {
    setFunnelSyncing(true);
    setFunnelSyncMsg('');
    try {
      const result = await triggerFunnelSync();
      setFunnelSyncMsg(
        result.data
          ? `${result.date}: ${result.data.charges}件の注文, ¥${result.data.revenue.toLocaleString()}の売上を取得`
          : `${result.date}: データなし`,
      );
      setLastFunnelSync(new Date().toISOString());
      await fetchAll();
    } catch (e) {
      setFunnelSyncMsg(e instanceof Error ? e.message : 'ファネル同期に失敗しました');
    } finally {
      setFunnelSyncing(false);
    }
  };

  const handleCreateGoal = async (data: { name: string; category: string; targetValue: number; unit: string; deadline: string }) => {
    try { await createGoal(data); fetchAll(); }
    catch (e) { setError(e instanceof Error ? e.message : '目標の作成に失敗しました'); }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('この目標を削除しますか？')) return;
    try { await deleteGoal(id); fetchAll(); }
    catch (e) { setError(e instanceof Error ? e.message : '目標の削除に失敗しました'); }
  };

  const handleUpdateProgress = async (id: string) => {
    const num = Number(editValue);
    if (!Number.isFinite(num) || num < 0) { setError('有効な数値を入力してください'); return; }
    try { await updateGoalProgress(id, num); setEditingGoalId(null); fetchAll(); }
    catch (e) { setError(e instanceof Error ? e.message : '進捗の更新に失敗しました'); }
  };

  const handleCreateAdSpend = async (data: Parameters<typeof createAdSpend>[0]) => {
    try { await createAdSpend(data); fetchAll(); }
    catch (e) { setError(e instanceof Error ? e.message : '広告費の作成に失敗しました'); }
  };

  const handleDeleteAdSpend = async (id: string) => {
    if (!confirm('この広告費データを削除しますか？')) return;
    try { await deleteAdSpend(id); fetchAll(); }
    catch (e) { setError(e instanceof Error ? e.message : '広告費の削除に失敗しました'); }
  };

  const handleCreateFunnel = async (data: Parameters<typeof createFunnelSnapshot>[0]) => {
    try { await createFunnelSnapshot(data); fetchAll(); }
    catch (e) { setError(e instanceof Error ? e.message : 'ファネルデータの保存に失敗しました'); }
  };

  const handleCreateAction = async (data: Parameters<typeof createActionPlan>[0]) => {
    await createActionPlan(data);
    fetchAll();
  };

  const openActionForm = (goalId: string, actionType?: ActionType, defaultTitle?: string) => {
    setActionFormGoalId(goalId);
    setActionFormDefaultType(actionType);
    setActionFormDefaultTitle(defaultTitle);
  };

  const overallProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.targetValue > 0 ? Math.min(g.currentValue / g.targetValue, 1) : 0), 0) / goals.length * 100)
    : 0;

  const funnelTotals = funnelSnapshots.reduce(
    (acc, s) => ({
      visitors: acc.visitors + s.visitors,
      freeGenerations: acc.freeGenerations + s.freeGenerations,
      charges: acc.charges + s.charges,
      physicalPurchases: acc.physicalPurchases + s.physicalPurchases,
    }),
    { visitors: 0, freeGenerations: 0, charges: 0, physicalPurchases: 0 },
  );
  const maxFunnel = Math.max(funnelTotals.visitors, 1);

  if (loading) return <div className="p-6 text-text-secondary">読み込み中...</div>;
  if (error) return <div className="p-6"><p className="text-danger mb-2">{error}</p><button onClick={fetchAll} className="text-sm text-primary hover:underline">再試行</button></div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-xl font-bold flex items-center gap-2"><Target size={22} /> 戦略コマンドセンター</h1>

      {/* Section 1: Strategic Goals with Auto KPI + Actions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">戦略KPI</h2>
            <p className="text-sm text-text-secondary">全体達成率: {overallProgress}%</p>
          </div>
          <button onClick={() => setShowGoalForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"><Plus size={16} /> 目標追加</button>
        </div>
        {goals.length > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
            <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pct = goal.targetValue > 0 ? Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100) : 0;
            const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
            const goalActions = actionsByGoal[goal.id] || [];
            return (
              <div key={goal.id} className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_BADGE_COLORS[goal.category as GoalCategory] || 'bg-gray-100 text-gray-700'}`}>
                      {CATEGORY_LABELS[goal.category as GoalCategory] || goal.category}
                    </span>
                    <h3 className="font-medium mt-1.5">{goal.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingGoalId(goal.id); setEditValue(String(goal.currentValue)); }} className="p-1 text-text-secondary hover:text-primary" aria-label={`${goal.name}を編集`}><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteGoal(goal.id)} className="p-1 text-text-secondary hover:text-danger" aria-label={`${goal.name}を削除`}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  {editingGoalId === goal.id ? (
                    <div className="flex items-center gap-2">
                      <input className="w-24 border border-border rounded px-2 py-1 text-sm" type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus />
                      <button onClick={() => handleUpdateProgress(goal.id)} className="text-xs text-primary hover:underline">保存</button>
                      <button onClick={() => setEditingGoalId(null)} className="text-xs text-text-secondary hover:underline">取消</button>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold">{goal.currentValue.toLocaleString()}<span className="text-sm font-normal text-text-secondary"> / {goal.targetValue.toLocaleString()} {goal.unit}</span></p>
                  )}
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
                  <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>{pct}%</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {goal.deadline}</span>
                </div>

                {/* Auto KPI */}
                <AutoKpiCard goal={goal} />

                {/* Quick Actions */}
                <QuickActions
                  category={goal.category as GoalCategory}
                  onAction={(actionType, defaultTitle) => openActionForm(goal.id, actionType, defaultTitle)}
                />

                {/* Action Plan List */}
                <ActionPlanList actions={goalActions} onRefresh={fetchAll} />

                {/* Add action button */}
                <button
                  onClick={() => openActionForm(goal.id)}
                  className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus size={12} /> アクション追加
                </button>
              </div>
            );
          })}
        </div>
        {goals.length === 0 && <p className="text-sm text-text-secondary bg-white rounded-xl border border-border p-8 text-center">目標がありません。「目標追加」から最初の目標を設定しましょう。</p>}
      </section>

      {/* Section 2: Conversion Funnel */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingUp size={20} /> コンバージョンファネル</h2>
            <p className="text-xs text-text-secondary mt-1">注文数・売上はSquareから自動取得。訪問者数・無料生成数は手動入力。</p>
          </div>
          <div className="flex items-center gap-2">
            {lastFunnelSync && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock size={12} />
                最終自動収集: {new Date(lastFunnelSync).toLocaleString('ja-JP')}
              </span>
            )}
            <button
              onClick={handleFunnelSync}
              disabled={funnelSyncing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw size={14} className={funnelSyncing ? 'animate-spin' : ''} />
              {funnelSyncing ? '収集中...' : '今すぐ収集'}
            </button>
            <button onClick={() => setShowFunnelForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-surface-secondary"><Plus size={16} /> データ入力</button>
          </div>
        </div>
        {funnelSyncMsg && (
          <p className="text-sm text-text-secondary mb-3">{funnelSyncMsg}</p>
        )}
        <div className="bg-white rounded-xl border border-border p-6">
          {funnelSnapshots.length > 0 ? (
            <div className="space-y-3">
              {[
                { label: '訪問', value: funnelTotals.visitors, rate: null },
                { label: '無料生成', value: funnelTotals.freeGenerations, rate: funnelRates.visitToFree },
                { label: 'チャージ', value: funnelTotals.charges, rate: funnelRates.freeToCharge },
                { label: '物理商品購入', value: funnelTotals.physicalPurchases, rate: funnelRates.chargeToPurchase },
              ].map((step, i) => (
                <div key={step.label}>
                  {i > 0 && <div className="flex items-center gap-2 text-xs text-text-secondary py-1 pl-4"><ArrowRight size={12} /> 転換率 {step.rate?.toFixed(1)}%</div>}
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium text-right">{step.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                      <div className="h-8 rounded-full bg-primary/70 flex items-center px-3 transition-all" style={{ width: `${Math.max((step.value / maxFunnel) * 100, 8)}%` }}>
                        <span className="text-xs font-medium text-white">{step.value.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border text-xs text-text-secondary text-center">
                全体転換率（訪問→購入）: <span className="font-medium text-primary">{funnelRates.visitToPurchase.toFixed(2)}%</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center py-4">ファネルデータがありません。「データ入力」から日次データを追加してください。</p>
          )}
        </div>
      </section>

      {/* Section 3: CAC / Ad Spend */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><DollarSign size={20} /> 顧客獲得コスト</h2>
          <button onClick={() => setShowAdSpendForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"><Plus size={16} /> 広告費追加</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: '広告費合計', value: `¥${cacSummary.totalSpend.toLocaleString()}` },
            { label: '獲得顧客数', value: `${cacSummary.totalConversions}人` },
            { label: '平均CAC', value: `¥${cacSummary.avgCac.toLocaleString()}` },
            { label: 'ROAS', value: `${cacSummary.roas.toFixed(2)}x` },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-border p-5">
              <p className="text-sm text-text-secondary mb-1">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
        {spends.length > 0 ? (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-surface-secondary/50">
                <th className="text-left px-4 py-3 font-medium">チャネル</th>
                <th className="text-left px-4 py-3 font-medium">期間</th>
                <th className="text-right px-4 py-3 font-medium">金額</th>
                <th className="text-right px-4 py-3 font-medium">CV数</th>
                <th className="text-right px-4 py-3 font-medium">CPA</th>
                <th className="text-right px-4 py-3 font-medium">売上</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody>
                {spends.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${CHANNEL_BADGE_COLORS[s.channel as AdChannel] || ''}`}>{CHANNEL_LABELS[s.channel as AdChannel] || s.channel}</span></td>
                    <td className="px-4 py-3">{s.period}</td>
                    <td className="px-4 py-3 text-right">¥{s.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{s.conversions}</td>
                    <td className="px-4 py-3 text-right">{s.conversions > 0 ? `¥${Math.round(s.amount / s.conversions).toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-3 text-right">¥{s.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteAdSpend(s.id)} className="text-text-secondary hover:text-danger"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-secondary bg-white rounded-xl border border-border p-8 text-center">広告費データがありません。「広告費追加」からデータを入力してください。</p>
        )}
      </section>

      <GoalForm isOpen={showGoalForm} onClose={() => setShowGoalForm(false)} onSubmit={handleCreateGoal} />
      <AdSpendForm isOpen={showAdSpendForm} onClose={() => setShowAdSpendForm(false)} onSubmit={handleCreateAdSpend} />
      <FunnelForm isOpen={showFunnelForm} onClose={() => setShowFunnelForm(false)} onSubmit={handleCreateFunnel} />
      {actionFormGoalId && (
        <ActionPlanForm
          isOpen
          onClose={() => setActionFormGoalId(null)}
          onSubmit={handleCreateAction}
          goalId={actionFormGoalId}
          defaultActionType={actionFormDefaultType}
          defaultTitle={actionFormDefaultTitle}
        />
      )}
    </div>
  );
}
