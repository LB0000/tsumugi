import { useCallback, useEffect, useState } from 'react';
import { Plus, Send, Sparkles, Ticket, Trash2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import {
  getCampaigns,
  createCampaign,
  deleteCampaign,
  sendCampaignEmail,
  getCoupons,
  createCoupon,
  toggleCoupon,
  generateEmailAI,
  type EmailPurpose,
} from '../api';
import { formatCurrency, formatFullDate } from '../lib/utils';
import type { Campaign, Coupon } from '../types';

type Tab = 'campaigns' | 'coupons';
const CAMPAIGNS_PAGE_SIZE = 50;
const COUPONS_PAGE_SIZE = 50;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  email: 'メール',
  coupon: 'クーポン',
  sns: 'SNS',
  ab_test: 'A/Bテスト',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  scheduled: '予約済み',
  active: '配信中',
  completed: '完了',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-amber-100 text-amber-700',
};

export function CampaignsPage() {
  const [tab, setTab] = useState<Tab>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Campaign creation form
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignType, setNewCampaignType] = useState('email');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');

  // Email send form
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSegment, setEmailSegment] = useState('');
  const [sending, setSending] = useState(false);
  const [emailIsHtml, setEmailIsHtml] = useState(false);
  const [aiPurpose, setAiPurpose] = useState<EmailPurpose>('promotion');
  const [aiTopic, setAiTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  // Coupon creation form
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState('percentage');
  const [couponValue, setCouponValue] = useState('');
  const [couponMaxUses, setCouponMaxUses] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');
  const [campaignOffset, setCampaignOffset] = useState(0);
  const [campaignTotal, setCampaignTotal] = useState(0);
  const [campaignHasMore, setCampaignHasMore] = useState(false);
  const [couponOffset, setCouponOffset] = useState(0);
  const [couponTotal, setCouponTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'campaigns') {
        const data = await getCampaigns({ limit: CAMPAIGNS_PAGE_SIZE, offset: campaignOffset });
        setCampaigns(data.campaigns);
        setCampaignTotal(data.pagination.total);
        setCampaignHasMore(data.pagination.hasMore);
      } else {
        const data = await getCoupons({ limit: COUPONS_PAGE_SIZE, offset: couponOffset });
        setCoupons(data.coupons);
        setCouponTotal(data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [campaignOffset, couponOffset, tab]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    try {
      await createCampaign({
        name: newCampaignName,
        type: newCampaignType,
        description: newCampaignDesc || undefined,
      });
      setShowCreateCampaign(false);
      setNewCampaignName('');
      setNewCampaignDesc('');
      if (campaignOffset !== 0) {
        setCampaignOffset(0);
      } else {
        void fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await deleteCampaign(id);
      if (campaignOffset !== 0) {
        setCampaignOffset(0);
      } else {
        void fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
    }
  };

  const handleSendEmail = async () => {
    if (!sendingCampaignId || !emailSubject.trim() || !emailBody.trim()) return;
    setSending(true);
    setMessage('');
    try {
      const htmlBody = emailIsHtml
        ? emailBody
        : `<p style="font-size:14px;color:#5A5148;line-height:1.8;">${escapeHtml(emailBody).replace(/\n/g, '<br>')}</p>`;
      const result = await sendCampaignEmail(sendingCampaignId, {
        subject: emailSubject,
        htmlBody,
        segment: emailSegment || undefined,
      });
      setMessage(`送信完了: ${result.sent}件成功, ${result.failed}件失敗`);
      setSendingCampaignId(null);
      setEmailSubject('');
      setEmailBody('');
      setEmailIsHtml(false);
      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateEmail = async () => {
    setGenerating(true);
    setError('');
    try {
      const segment = (emailSegment || 'all') as import('../api').EmailSegment;
      const result = await generateEmailAI(segment, aiPurpose, aiTopic || undefined);
      setEmailSubject(result.subject);
      setEmailBody(result.body);
      setEmailIsHtml(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!couponValue) return;
    try {
      await createCoupon({
        code: couponCode || undefined,
        discountType: couponType,
        discountValue: Number(couponValue),
        maxUses: couponMaxUses ? Number(couponMaxUses) : undefined,
        expiresAt: couponExpiry || undefined,
      });
      setShowCreateCoupon(false);
      setCouponCode('');
      setCouponValue('');
      setCouponMaxUses('');
      setCouponExpiry('');
      if (couponOffset !== 0) {
        setCouponOffset(0);
      } else {
        void fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create coupon');
    }
  };

  const handleToggleCoupon = async (id: string, isActive: boolean) => {
    try {
      await toggleCoupon(id, !isActive);
      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle coupon');
    }
  };

  return (
    <div>
      <Header title="キャンペーン管理" />
      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-surface-secondary rounded-lg p-1 w-fit">
          {([['campaigns', 'キャンペーン'], ['coupons', 'クーポン']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                if (key === 'campaigns') setCampaignOffset(0);
                if (key === 'coupons') setCouponOffset(0);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === key ? 'bg-white text-text shadow-sm' : 'text-text-secondary hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 text-danger p-4 rounded-xl text-sm">{error}</div>}
        {message && <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm">{message}</div>}

        {/* Campaigns Tab */}
        {tab === 'campaigns' && (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-text-secondary">{campaignTotal}件のキャンペーン</h3>
              <button
                onClick={() => setShowCreateCampaign(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} /> 新規作成
              </button>
            </div>

            {/* Create Campaign Form */}
            {showCreateCampaign && (
              <div className="bg-white rounded-xl border border-border p-4 space-y-3">
                <input
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="キャンペーン名"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <select
                  value={newCampaignType}
                  onChange={(e) => setNewCampaignType(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm"
                >
                  <option value="email">メール</option>
                  <option value="coupon">クーポン</option>
                  <option value="sns">SNS</option>
                </select>
                <textarea
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  placeholder="説明（任意）"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={handleCreateCampaign} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">作成</button>
                  <button onClick={() => setShowCreateCampaign(false)} className="px-4 py-2 border border-border rounded-lg text-sm">キャンセル</button>
                </div>
              </div>
            )}

            {/* Email Send Form */}
            {sendingCampaignId && (
              <div className="bg-white rounded-xl border border-primary/30 p-4 space-y-3">
                <h4 className="text-sm font-medium text-text">メール配信</h4>
                <select
                  value={emailSegment}
                  onChange={(e) => setEmailSegment(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm"
                >
                  <option value="">全顧客</option>
                  <option value="new">新規のみ</option>
                  <option value="active">アクティブのみ</option>
                  <option value="lapsed">休眠のみ</option>
                </select>
                <div className="bg-surface-secondary/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                    <Sparkles size={12} /> AIで文面を生成
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={aiPurpose}
                      onChange={(e) => setAiPurpose(e.target.value as EmailPurpose)}
                      className="px-3 py-1.5 border border-border rounded-lg text-xs bg-white"
                    >
                      <option value="welcome">ウェルカム</option>
                      <option value="promotion">プロモーション</option>
                      <option value="reactivation">再活性化</option>
                      <option value="newsletter">ニュースレター</option>
                    </select>
                    <input
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="追加の指示（任意）"
                      className="flex-1 min-w-[120px] px-3 py-1.5 border border-border rounded-lg text-xs"
                    />
                    <button
                      onClick={handleGenerateEmail}
                      disabled={generating}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      <Sparkles size={12} /> {generating ? '生成中...' : 'AI生成'}
                    </button>
                  </div>
                </div>
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="件名"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="メール本文（プレーンテキスト、またはAI生成）"
                  rows={6}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={emailIsHtml}
                    onChange={(e) => setEmailIsHtml(e.target.checked)}
                    className="rounded border-border"
                  />
                  HTML形式として送信する
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSendEmail}
                    disabled={sending}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    <Send size={14} /> {sending ? '送信中...' : '送信'}
                  </button>
                  <button onClick={() => setSendingCampaignId(null)} className="px-4 py-2 border border-border rounded-lg text-sm">キャンセル</button>
                </div>
              </div>
            )}

            {/* Campaign List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="bg-white rounded-xl border border-border p-8 text-center">
                <p className="text-text-secondary">キャンペーンがありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-white rounded-xl border border-border p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text text-sm">{campaign.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>
                          {STATUS_LABELS[campaign.status]}
                        </span>
                        <span className="text-xs text-text-secondary">{CAMPAIGN_TYPE_LABELS[campaign.type]}</span>
                      </div>
                      {campaign.description && (
                        <p className="text-xs text-text-secondary mt-1">{campaign.description}</p>
                      )}
                      <p className="text-xs text-text-secondary mt-1">作成: {formatFullDate(campaign.createdAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      {campaign.type === 'email' && campaign.status === 'draft' && (
                        <button
                          onClick={() => setSendingCampaignId(campaign.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <Send size={12} /> 配信
                        </button>
                      )}
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-danger hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>
                    {campaignTotal === 0
                      ? '0件'
                      : `${campaignOffset + 1}-${Math.min(campaignOffset + campaigns.length, campaignTotal)}件 / 全${campaignTotal}件`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCampaignOffset((prev) => Math.max(prev - CAMPAIGNS_PAGE_SIZE, 0))}
                      disabled={campaignOffset === 0 || loading}
                      className="px-3 py-1.5 border border-border rounded-md disabled:opacity-50"
                    >
                      前へ
                    </button>
                    <button
                      onClick={() => setCampaignOffset((prev) => prev + CAMPAIGNS_PAGE_SIZE)}
                      disabled={loading || !campaignHasMore}
                      className="px-3 py-1.5 border border-border rounded-md disabled:opacity-50"
                    >
                      次へ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Coupons Tab */}
        {tab === 'coupons' && (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-text-secondary">{couponTotal}件のクーポン</h3>
              <button
                onClick={() => setShowCreateCoupon(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Ticket size={16} /> 新規作成
              </button>
            </div>

            {/* Create Coupon Form */}
            {showCreateCoupon && (
              <div className="bg-white rounded-xl border border-border p-4 space-y-3">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="クーポンコード（空欄で自動生成）"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <div className="flex gap-3">
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm"
                  >
                    <option value="percentage">%割引</option>
                    <option value="fixed">固定額割引</option>
                  </select>
                  <input
                    type="number"
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    placeholder={couponType === 'percentage' ? '割引率(%)' : '割引額(円)'}
                    className="px-3 py-2 border border-border rounded-lg text-sm w-32"
                  />
                  <input
                    type="number"
                    value={couponMaxUses}
                    onChange={(e) => setCouponMaxUses(e.target.value)}
                    placeholder="利用上限数"
                    className="px-3 py-2 border border-border rounded-lg text-sm w-32"
                  />
                </div>
                <input
                  type="date"
                  value={couponExpiry}
                  onChange={(e) => setCouponExpiry(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={handleCreateCoupon} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">作成</button>
                  <button onClick={() => setShowCreateCoupon(false)} className="px-4 py-2 border border-border rounded-lg text-sm">キャンセル</button>
                </div>
              </div>
            )}

            {/* Coupon List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : coupons.length === 0 ? (
              <div className="bg-white rounded-xl border border-border p-8 text-center">
                <p className="text-text-secondary">クーポンがありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-secondary/50">
                        <th className="text-left px-4 py-3 font-medium text-text-secondary">コード</th>
                        <th className="text-left px-4 py-3 font-medium text-text-secondary">割引</th>
                        <th className="text-right px-4 py-3 font-medium text-text-secondary">利用数</th>
                        <th className="text-left px-4 py-3 font-medium text-text-secondary">有効期限</th>
                        <th className="text-left px-4 py-3 font-medium text-text-secondary">状態</th>
                        <th className="text-right px-4 py-3 font-medium text-text-secondary"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((coupon) => (
                        <tr key={coupon.id} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-3 font-mono font-medium text-text">{coupon.code}</td>
                          <td className="px-4 py-3 text-text">
                            {coupon.discountType === 'percentage'
                              ? `${coupon.discountValue}%`
                              : formatCurrency(coupon.discountValue)}
                          </td>
                          <td className="px-4 py-3 text-right text-text">
                            {coupon.currentUses}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {coupon.expiresAt ? formatFullDate(coupon.expiresAt) : '無期限'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {coupon.isActive ? '有効' : '無効'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleToggleCoupon(coupon.id, coupon.isActive)}
                              className="text-xs text-text-secondary hover:text-text"
                            >
                              {coupon.isActive ? '無効化' : '有効化'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>
                    {couponTotal === 0
                      ? '0件'
                      : `${couponOffset + 1}-${Math.min(couponOffset + coupons.length, couponTotal)}件 / 全${couponTotal}件`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCouponOffset((prev) => Math.max(prev - COUPONS_PAGE_SIZE, 0))}
                      disabled={couponOffset === 0 || loading}
                      className="px-3 py-1.5 border border-border rounded-md disabled:opacity-50"
                    >
                      前へ
                    </button>
                    <button
                      onClick={() => setCouponOffset((prev) => prev + COUPONS_PAGE_SIZE)}
                      disabled={loading || couponOffset + coupons.length >= couponTotal}
                      className="px-3 py-1.5 border border-border rounded-md disabled:opacity-50"
                    >
                      次へ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
