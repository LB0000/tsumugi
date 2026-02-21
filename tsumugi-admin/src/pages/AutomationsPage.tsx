import { useState, useEffect, useCallback } from 'react';
import { Zap, Plus, Play, Pause, Trash2, Users, Mail, ChevronDown, ChevronUp, Square, Loader2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import {
  getAutomations, getAutomation, createAutomation, deleteAutomation,
  activateAutomation, pauseAutomation, getEnrollments, stopEnrollment,
  type Automation, type AutomationDetail, type AutomationStep, type AutomationEnrollment,
} from '../api/automations';

const TRIGGER_OPTIONS = [
  { value: 'welcome', label: 'ウェルカム', desc: '新規登録時' },
  { value: 'post_purchase', label: '購入後フォロー', desc: '初回購入後' },
  { value: 'reactivation', label: '休眠復帰', desc: 'セグメントがlapsedに変化' },
  { value: 're_engagement', label: '再エンゲージメント', desc: '30日間無購入' },
] as const;

const SKIP_OPTIONS = [
  { value: '', label: 'なし' },
  { value: 'purchased_since_trigger', label: '購入した場合スキップ' },
  { value: 'became_active', label: 'アクティブになった場合スキップ' },
];

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
};

const ENROLLMENT_BADGES: Record<string, string> = {
  active: 'text-green-700',
  completed: 'text-blue-600',
  stopped: 'text-text-secondary',
  skipped: 'text-amber-600',
};

function emptyStep(index: number): AutomationStep {
  return {
    stepIndex: index,
    delayMinutes: index === 0 ? 0 : 1440,
    subject: '',
    htmlBody: '',
    useAiGeneration: false,
    skipCondition: null,
  };
}

export function AutomationsPage() {
  const [automationsList, setAutomationsList] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [executing, setExecuting] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AutomationDetail | null>(null);
  const [enrollmentsList, setEnrollmentsList] = useState<AutomationEnrollment[]>([]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTrigger, setFormTrigger] = useState('welcome');
  const [formSteps, setFormSteps] = useState<AutomationStep[]>([emptyStep(0)]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAutomations();
      setAutomationsList(data.automations);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const data = await getAutomations();
      setAutomationsList(data.automations);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void fetchList(); }, [fetchList]);

  const handleCreate = async () => {
    if (!formName.trim()) { setError('名前を入力してください'); return; }
    if (formSteps.some((s) => !s.useAiGeneration && !s.subject.trim())) {
      setError('各ステップの件名を入力するか、AI生成を有効にしてください');
      return;
    }
    setExecuting('create');
    setError('');
    try {
      await createAutomation({ name: formName, triggerType: formTrigger, steps: formSteps });
      setShowForm(false);
      resetForm();
      void silentRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setExecuting(null);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormTrigger('welcome');
    setFormSteps([emptyStep(0)]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このオートメーションを削除しますか？')) return;
    setExecuting(id);
    setError('');
    try {
      await deleteAutomation(id);
      if (expandedId === id) setExpandedId(null);
      void silentRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setExecuting(null);
    }
  };

  const handleActivate = async (id: string) => {
    if (!confirm('このオートメーションを有効化しますか？登録顧客へのメール配信が開始されます。')) return;
    setExecuting(id);
    setError('');
    try {
      await activateAutomation(id);
      void silentRefresh();
      if (expandedId === id) await loadDetail(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '有効化に失敗しました');
    } finally {
      setExecuting(null);
    }
  };

  const handlePause = async (id: string) => {
    setExecuting(id);
    setError('');
    try {
      await pauseAutomation(id);
      void silentRefresh();
      if (expandedId === id) await loadDetail(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '一時停止に失敗しました');
    } finally {
      setExecuting(null);
    }
  };

  const loadDetail = async (id: string) => {
    try {
      const [d, e] = await Promise.all([getAutomation(id), getEnrollments(id)]);
      setDetail(d);
      setEnrollmentsList(e.enrollments);
    } catch (err) {
      setError(err instanceof Error ? err.message : '詳細の取得に失敗しました');
    }
  };

  const toggleExpand = async (id: string) => {
    if (detailLoading) return;
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      setEnrollmentsList([]);
    } else {
      setExpandedId(id);
      setDetailLoading(true);
      await loadDetail(id);
      setDetailLoading(false);
    }
  };

  const handleStopEnrollment = async (automationId: string, enrollmentId: string) => {
    setExecuting(enrollmentId);
    setError('');
    try {
      await stopEnrollment(automationId, enrollmentId);
      await loadDetail(automationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止に失敗しました');
    } finally {
      setExecuting(null);
    }
  };

  const updateStep = (index: number, updates: Partial<AutomationStep>) => {
    setFormSteps((prev) => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const addStep = () => {
    if (formSteps.length >= 5) return;
    setFormSteps((prev) => [...prev, emptyStep(prev.length)]);
  };

  const removeStep = (index: number) => {
    if (formSteps.length <= 1) return;
    setFormSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepIndex: i })));
  };

  const formatDelay = (minutes: number) => {
    if (minutes === 0) return '即時';
    if (minutes < 60) return `${minutes}分後`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}時間後`;
    return `${Math.round(minutes / 1440)}日後`;
  };

  return (
    <div>
      <Header title="メール自動配信" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            <span className="text-sm text-text-secondary">
              {automationsList.filter((a) => a.status === 'active').length}件のアクティブなオートメーション
            </span>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus size={16} />
            新規作成
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-danger p-3 rounded-xl text-sm flex justify-between items-center" role="alert">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-danger hover:opacity-70 ml-2" aria-label="閉じる">
              ×
            </button>
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-medium">新しいオートメーション</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">名前</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  placeholder="例: ウェルカムシーケンス"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">トリガー</label>
                <select
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
                >
                  {TRIGGER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Steps Editor */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">ステップ</label>
              <div className="space-y-3">
                {formSteps.map((step, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ステップ {i + 1}</span>
                      {formSteps.length > 1 && (
                        <button
                          onClick={() => removeStep(i)}
                          className="text-text-secondary hover:text-danger"
                          aria-label={`ステップ ${i + 1} を削除`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">遅延（分）</label>
                        <input
                          type="number"
                          min={0}
                          value={step.delayMinutes}
                          onChange={(e) => updateStep(i, { delayMinutes: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full px-2 py-1.5 border border-border rounded text-sm"
                        />
                        <span className="text-xs text-text-secondary">{formatDelay(step.delayMinutes)}</span>
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">スキップ条件</label>
                        <select
                          value={step.skipCondition || ''}
                          onChange={(e) => updateStep(i, { skipCondition: e.target.value || null })}
                          className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white"
                        >
                          {SKIP_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={step.useAiGeneration}
                            onChange={(e) => updateStep(i, { useAiGeneration: e.target.checked })}
                            className="rounded"
                          />
                          AI生成
                        </label>
                      </div>
                    </div>

                    {step.useAiGeneration ? (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">AIへの指示（任意）</label>
                        <input
                          value={step.aiTopic || ''}
                          onChange={(e) => updateStep(i, { aiTopic: e.target.value })}
                          className="w-full px-2 py-1.5 border border-border rounded text-sm"
                          placeholder="例: 初回購入のお礼とレビュー依頼"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">件名</label>
                          <input
                            value={step.subject}
                            onChange={(e) => updateStep(i, { subject: e.target.value })}
                            className="w-full px-2 py-1.5 border border-border rounded text-sm"
                            placeholder="メールの件名"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">本文（HTML）</label>
                          <textarea
                            value={step.htmlBody}
                            onChange={(e) => updateStep(i, { htmlBody: e.target.value })}
                            className="w-full px-2 py-1.5 border border-border rounded text-sm h-24 resize-y"
                            placeholder="<p>メール本文</p>"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {formSteps.length < 5 && (
                <button
                  onClick={addStep}
                  className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Plus size={14} /> ステップ追加
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreate}
                disabled={executing === 'create'}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {executing === 'create' ? <Loader2 size={16} className="animate-spin inline mr-1" /> : null}
                下書き保存
              </button>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-surface-secondary"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* Automations List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : automationsList.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-8 text-center">
            <Zap size={32} className="mx-auto text-text-secondary mb-3" />
            <p className="text-text-secondary">
              オートメーションがありません。「新規作成」から最初の自動配信を設定しましょう。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {automationsList.map((auto) => {
              const steps: AutomationStep[] = (() => { try { return JSON.parse(auto.steps); } catch { return []; } })();
              const isExpanded = expandedId === auto.id;

              return (
                <div key={auto.id} className="bg-white rounded-xl border border-border overflow-hidden">
                  {/* Row */}
                  <div className="px-5 py-4 flex items-center gap-4">
                    <button onClick={() => void toggleExpand(auto.id)} className="flex-1 text-left flex items-center gap-3">
                      {isExpanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{auto.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGES[auto.status] || ''}`}>
                            {auto.status === 'draft' ? '下書き' : auto.status === 'active' ? '有効' : '停止中'}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {auto.triggerLabel || auto.triggerType} · {steps.length}ステップ
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><Users size={14} />{auto.enrollments?.total ?? 0}</span>
                      <span className="flex items-center gap-1"><Mail size={14} />{auto.totalSent ?? 0}</span>
                    </div>

                    <div className="flex gap-1">
                      {auto.status !== 'active' ? (
                        <button
                          onClick={() => void handleActivate(auto.id)}
                          disabled={executing === auto.id}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                          title="有効化"
                          aria-label="有効化"
                        >
                          {executing === auto.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        </button>
                      ) : (
                        <button
                          onClick={() => void handlePause(auto.id)}
                          disabled={executing === auto.id}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50"
                          title="一時停止"
                          aria-label="一時停止"
                        >
                          {executing === auto.id ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
                        </button>
                      )}
                      <button
                        onClick={() => void handleDelete(auto.id)}
                        disabled={executing === auto.id}
                        className="p-1.5 text-text-secondary hover:text-danger hover:bg-red-50 rounded disabled:opacity-50"
                        title="削除"
                        aria-label="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && detailLoading && !detail && (
                    <div className="border-t border-border px-5 py-4 flex justify-center">
                      <Loader2 size={20} className="animate-spin text-text-secondary" />
                    </div>
                  )}
                  {isExpanded && detail && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: '登録数', value: detail.stats.totalEnrolled },
                          { label: 'アクティブ', value: detail.stats.active },
                          { label: '完了', value: detail.stats.completed },
                          { label: '送信数', value: detail.stats.totalSent },
                        ].map((s) => (
                          <div key={s.label} className="bg-surface-secondary rounded-lg px-3 py-2">
                            <p className="text-xs text-text-secondary">{s.label}</p>
                            <p className="text-lg font-bold">{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Steps Timeline */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">ステップ</h4>
                        <div className="space-y-2">
                          {steps.map((step, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                {i + 1}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {step.useAiGeneration ? 'AI生成メール' : step.subject || '(件名なし)'}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {formatDelay(step.delayMinutes)}
                                  {step.skipCondition && ` · 条件: ${step.skipCondition === 'purchased_since_trigger' ? '購入時スキップ' : 'アクティブ時スキップ'}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Enrollments */}
                      {enrollmentsList.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">登録顧客 ({enrollmentsList.length})</h4>
                          <div className="bg-surface-secondary rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border">
                                  <th scope="col" className="text-left px-3 py-2 font-medium">顧客</th>
                                  <th scope="col" className="text-left px-3 py-2 font-medium">ステップ</th>
                                  <th scope="col" className="text-left px-3 py-2 font-medium">ステータス</th>
                                  <th scope="col" className="text-left px-3 py-2 font-medium">次回送信</th>
                                  <th scope="col" className="px-3 py-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {enrollmentsList.slice(0, 20).map((enr) => (
                                  <tr key={enr.id} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2">
                                      <div>{enr.customerName || '—'}</div>
                                      <div className="text-text-secondary">{enr.customerEmail}</div>
                                    </td>
                                    <td className="px-3 py-2">{enr.currentStepIndex + 1}/{steps.length}</td>
                                    <td className="px-3 py-2">
                                      <span className={ENROLLMENT_BADGES[enr.status] || ''}>
                                        {enr.status === 'active' ? '進行中' : enr.status === 'completed' ? '完了' : enr.status === 'stopped' ? '停止' : enr.status}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-text-secondary">
                                      {enr.nextSendAt ? new Date(enr.nextSendAt).toLocaleString('ja-JP') : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {enr.status === 'active' && (
                                        <button
                                          onClick={() => void handleStopEnrollment(auto.id, enr.id)}
                                          disabled={executing === enr.id}
                                          className="text-text-secondary hover:text-danger disabled:opacity-50"
                                          title="停止"
                                          aria-label="登録を停止"
                                        >
                                          {executing === enr.id ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {enrollmentsList.length > 20 && (
                            <p className="text-xs text-text-secondary text-center py-2">
                              他 {enrollmentsList.length - 20} 件（上位20件を表示中）
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
