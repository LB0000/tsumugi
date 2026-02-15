import { useCallback, useEffect, useState } from 'react';
import { Users, RefreshCw, UserCheck, Repeat, TrendingUp } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/analytics/StatCard';
import { getCustomers, getCustomerStats, setCustomerMarketingOptOut, syncCustomers } from '../api';
import { formatCurrency, formatFullDate } from '../lib/utils';
import { SEGMENT_LABELS, SEGMENT_BADGE_COLORS } from '../lib/constants';
import type { Customer, CustomerStats } from '../types';

const CUSTOMERS_PAGE_SIZE = 50;

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [customerOffset, setCustomerOffset] = useState(0);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerHasMore, setCustomerHasMore] = useState(false);
  const [updatingCustomerId, setUpdatingCustomerId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [customerResult, customerStats] = await Promise.all([
        getCustomers({
          segment: segmentFilter || undefined,
          sort: sortBy,
          limit: CUSTOMERS_PAGE_SIZE,
          offset: customerOffset,
        }),
        getCustomerStats(),
      ]);
      setCustomers(customerResult.customers);
      setCustomerTotal(customerResult.pagination.total);
      setCustomerHasMore(customerResult.pagination.hasMore);
      setStats(customerStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '顧客データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [customerOffset, segmentFilter, sortBy]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await syncCustomers();
      setSyncMessage(`同期完了: ${result.created}件追加, ${result.updated}件更新`);
      await fetchData();
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : '同期に失敗しました');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleMarketing = async (customer: Customer) => {
    setUpdatingCustomerId(customer.id);
    setSyncMessage('');
    try {
      const updatedCustomer = await setCustomerMarketingOptOut(customer.id, !customer.marketingOptOutAt);
      setCustomers((prev) => prev.map((item) => (item.id === updatedCustomer.id ? updatedCustomer : item)));
      setSyncMessage(
        updatedCustomer.marketingOptOutAt
          ? `${updatedCustomer.email} を配信停止にしました`
          : `${updatedCustomer.email} の配信停止を解除しました`,
      );
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : '配信設定の更新に失敗しました');
    } finally {
      setUpdatingCustomerId(null);
    }
  };

  return (
    <div>
      <Header title="顧客管理" />
      <div className="p-6 space-y-6">
        {/* Sync Button & Stats */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? '同期中...' : 'データ同期'}
            </button>
            {syncMessage && (
              <span className="text-sm text-text-secondary self-center">{syncMessage}</span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-danger p-4 rounded-xl text-sm">{error}</div>
        )}

        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="総顧客数"
              value={`${stats.totalCustomers}人`}
              icon={<Users size={18} />}
            />
            <StatCard
              label="購入顧客数"
              value={`${stats.customersWithPurchases}人`}
              icon={<UserCheck size={18} />}
            />
            <StatCard
              label="リピート率"
              value={`${stats.repeatRate}%`}
              icon={<Repeat size={18} />}
            />
            <StatCard
              label="平均LTV"
              value={formatCurrency(stats.avgLTV)}
              icon={<TrendingUp size={18} />}
            />
          </div>
        )}

        {/* Segment Overview */}
        {stats && (
          <div className="bg-white rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-text mb-3">セグメント分布</h3>
            <div className="flex gap-6">
              {(['new', 'active', 'lapsed'] as const).map((seg) => (
                <div key={seg} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEGMENT_BADGE_COLORS[seg]}`}>
                    {SEGMENT_LABELS[seg]}
                  </span>
                  <span className="text-sm text-text-secondary">{stats.segments[seg]}人</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={segmentFilter}
            onChange={(e) => {
              setSegmentFilter(e.target.value);
              setCustomerOffset(0);
            }}
            className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white"
          >
            <option value="">全セグメント</option>
            <option value="new">新規</option>
            <option value="active">アクティブ</option>
            <option value="lapsed">休眠</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCustomerOffset(0);
            }}
            className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white"
          >
            <option value="recent">最終購入日順</option>
            <option value="spent">累計購入額順</option>
            <option value="orders">注文数順</option>
            <option value="registered">登録日順</option>
          </select>
        </div>

        {/* Customer Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-8 text-center">
            <p className="text-text-secondary">
              顧客データがありません。「データ同期」をクリックしてTSUMUGIからデータを取得してください。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">顧客名</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">メール</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">セグメント</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">注文数</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">累計購入額</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">最終購入</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">認証</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">メール配信</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-border last:border-b-0 hover:bg-surface-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-text">{customer.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{customer.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEGMENT_BADGE_COLORS[customer.segment]}`}>
                          {SEGMENT_LABELS[customer.segment]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-text">{customer.totalOrders}件</td>
                      <td className="px-4 py-3 text-right text-text">{formatCurrency(customer.totalSpent)}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {customer.lastPurchaseAt ? formatFullDate(customer.lastPurchaseAt) : '-'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {customer.authProvider === 'google' ? 'Google' : 'Email'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={customer.marketingOptOutAt ? 'text-danger' : 'text-green-700'}>
                            {customer.marketingOptOutAt ? '停止中' : '配信中'}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleToggleMarketing(customer)}
                            disabled={updatingCustomerId === customer.id}
                            className="px-2 py-1 border border-border rounded-md disabled:opacity-50"
                          >
                            {updatingCustomerId === customer.id
                              ? '更新中...'
                              : customer.marketingOptOutAt ? '解除' : '停止'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>
                {customerTotal === 0
                  ? '0件'
                  : `${customerOffset + 1}-${Math.min(customerOffset + customers.length, customerTotal)}件 / 全${customerTotal}件`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCustomerOffset((prev) => Math.max(prev - CUSTOMERS_PAGE_SIZE, 0))}
                  disabled={customerOffset === 0 || loading}
                  className="px-3 py-1.5 border border-border rounded-md disabled:opacity-50"
                >
                  前へ
                </button>
                <button
                  onClick={() => setCustomerOffset((prev) => prev + CUSTOMERS_PAGE_SIZE)}
                  disabled={loading || !customerHasMore}
                  className="px-3 py-1.5 border border-border rounded-md disabled:opacity-50"
                >
                  次へ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
