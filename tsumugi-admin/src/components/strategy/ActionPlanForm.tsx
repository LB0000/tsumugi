import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { ActionType, ActionPriority } from '../../types/strategy';
import { ACTION_TYPE_LABELS, PRIORITY_LABELS } from '../../types/strategy';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    goalId: string;
    title: string;
    description?: string;
    actionType: string;
    priority?: string;
    dueDate?: string;
    config?: string;
  }) => Promise<void>;
  goalId: string;
  defaultActionType?: ActionType;
  defaultTitle?: string;
}

const ACTION_TYPES: ActionType[] = ['email', 'coupon', 'content', 'sync', 'manual'];
const PRIORITIES: ActionPriority[] = ['high', 'medium', 'low'];

export function ActionPlanForm({ isOpen, onClose, onSubmit, goalId, defaultActionType, defaultTitle }: Props) {
  const [title, setTitle] = useState(defaultTitle || '');
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState<ActionType>(defaultActionType || 'manual');
  const [priority, setPriority] = useState<ActionPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Config fields based on action type
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSegment, setEmailSegment] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState('percentage');
  const [couponDiscountValue, setCouponDiscountValue] = useState('10');
  const [contentType, setContentType] = useState('sns_post');
  const [contentPlatform, setContentPlatform] = useState('instagram');
  const [contentTopic, setContentTopic] = useState('');

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setActionType('manual');
    setPriority('medium');
    setDueDate('');
    setFormError(null);
    setEmailSubject('');
    setEmailBody('');
    setEmailSegment('');
    setCouponDiscountType('percentage');
    setCouponDiscountValue('10');
    setContentType('sns_post');
    setContentPlatform('instagram');
    setContentTopic('');
  };

  const buildConfig = (): string | undefined => {
    switch (actionType) {
      case 'email':
        if (!emailSubject.trim() || !emailBody.trim()) return undefined;
        return JSON.stringify({
          subject: emailSubject.trim(),
          htmlBody: emailBody.trim(),
          ...(emailSegment && { segment: emailSegment }),
        });
      case 'coupon':
        return JSON.stringify({
          discountType: couponDiscountType,
          discountValue: Number(couponDiscountValue) || 10,
        });
      case 'content':
        if (!contentTopic.trim()) return undefined;
        return JSON.stringify({
          contentType,
          platform: contentPlatform,
          topic: contentTopic.trim(),
        });
      default:
        return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setSubmitting(true);
      setFormError(null);
      await onSubmit({
        goalId,
        title: title.trim(),
        description: description.trim() || undefined,
        actionType,
        priority,
        dueDate: dueDate || undefined,
        config: buildConfig(),
      });
      resetForm();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'アクションの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="action-form-title">
      <div className="bg-white rounded-xl border border-border p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 id="action-form-title" className="font-semibold">アクション追加</h3>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text" aria-label="閉じる"><X size={18} /></button>
        </div>
        {formError && <p className="text-sm text-danger mb-3">{formError}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="action-title" className="block text-sm font-medium mb-1">タイトル</label>
            <input id="action-title" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="action-desc" className="block text-sm font-medium mb-1">説明</label>
            <textarea id="action-desc" className="w-full border border-border rounded-lg px-3 py-2 text-sm" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="action-type" className="block text-sm font-medium mb-1">種別</label>
              <select id="action-type" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={actionType} onChange={(e) => setActionType(e.target.value as ActionType)}>
                {ACTION_TYPES.map((t) => <option key={t} value={t}>{ACTION_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="action-priority" className="block text-sm font-medium mb-1">優先度</label>
              <select id="action-priority" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as ActionPriority)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="action-due" className="block text-sm font-medium mb-1">期限</label>
            <input id="action-due" type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {/* Action type specific config */}
          {actionType === 'email' && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-text-secondary">メール設定</p>
              <div>
                <label htmlFor="email-subject" className="block text-xs mb-1">件名</label>
                <input id="email-subject" className="w-full border border-border rounded px-2 py-1.5 text-sm" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="例: TSUMUGIからのお願い" />
              </div>
              <div>
                <label htmlFor="email-body" className="block text-xs mb-1">本文（HTML）</label>
                <textarea id="email-body" className="w-full border border-border rounded px-2 py-1.5 text-sm font-mono" rows={4} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="<p>お客様各位...</p>" />
              </div>
              <div>
                <label htmlFor="email-segment" className="block text-xs mb-1">セグメント</label>
                <select id="email-segment" className="w-full border border-border rounded px-2 py-1.5 text-sm" value={emailSegment} onChange={(e) => setEmailSegment(e.target.value)}>
                  <option value="">全顧客</option>
                  <option value="new">新規</option>
                  <option value="active">アクティブ</option>
                  <option value="lapsed">休眠</option>
                </select>
              </div>
            </div>
          )}

          {actionType === 'coupon' && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-text-secondary">クーポン設定</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="coupon-type" className="block text-xs mb-1">タイプ</label>
                  <select id="coupon-type" className="w-full border border-border rounded px-2 py-1.5 text-sm" value={couponDiscountType} onChange={(e) => setCouponDiscountType(e.target.value)}>
                    <option value="percentage">割合（%）</option>
                    <option value="fixed">固定額（¥）</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="coupon-value" className="block text-xs mb-1">値</label>
                  <input id="coupon-value" type="number" className="w-full border border-border rounded px-2 py-1.5 text-sm" value={couponDiscountValue} onChange={(e) => setCouponDiscountValue(e.target.value)} min="1" />
                </div>
              </div>
            </div>
          )}

          {actionType === 'content' && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-text-secondary">コンテンツ生成設定</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="content-type" className="block text-xs mb-1">タイプ</label>
                  <select id="content-type" className="w-full border border-border rounded px-2 py-1.5 text-sm" value={contentType} onChange={(e) => setContentType(e.target.value)}>
                    <option value="sns_post">SNS投稿</option>
                    <option value="ad_copy">広告コピー</option>
                    <option value="blog_article">ブログ記事</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="content-platform" className="block text-xs mb-1">プラットフォーム</label>
                  <select id="content-platform" className="w-full border border-border rounded px-2 py-1.5 text-sm" value={contentPlatform} onChange={(e) => setContentPlatform(e.target.value)}>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter</option>
                    <option value="tiktok">TikTok</option>
                    <option value="blog">ブログ</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="content-topic" className="block text-xs mb-1">トピック</label>
                <input id="content-topic" className="w-full border border-border rounded px-2 py-1.5 text-sm" value={contentTopic} onChange={(e) => setContentTopic(e.target.value)} placeholder="例: レビュー投稿の促進キャンペーン" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text">キャンセル</button>
            <button type="submit" disabled={submitting || !title.trim()} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              {submitting ? '保存中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
