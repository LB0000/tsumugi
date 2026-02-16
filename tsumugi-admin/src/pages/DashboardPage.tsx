import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, DollarSign, Users, TrendingUp, Repeat, UserCheck } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/analytics/StatCard';
import { RevenueChart } from '../components/analytics/RevenueChart';
import { ProductBreakdown } from '../components/analytics/ProductBreakdown';
import { StylePopularity } from '../components/analytics/StylePopularity';
import { getAnalyticsSummary, getCustomerStats, getStyleAnalytics } from '../api';
import { formatCurrency } from '../lib/utils';
import { SEGMENT_LABELS, SEGMENT_BAR_COLORS } from '../lib/constants';
import type { AnalyticsSummary, CustomerStats } from '../types';
import type { StyleAnalyticsData } from '../api';

export function DashboardPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [styleData, setStyleData] = useState<StyleAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  const fetchDashboardData = useCallback(async () => {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().slice(0, 10);
    })();

    setLoading(true);
    setError('');

    try {
      const [analytics, stats, styles] = await Promise.all([
        getAnalyticsSummary(startDate, endDate),
        getCustomerStats(),
        getStyleAnalytics().catch(() => null),
      ]);
      setData(analytics);
      setCustomerStats(stats);
      setStyleData(styles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div>
      <Header title="ダッシュボード" />
      <div className="p-6 space-y-6">
        {/* Period selector */}
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === d
                  ? 'bg-primary text-white'
                  : 'bg-white border border-border text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              {d}日間
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-danger p-4 rounded-xl text-sm">{error}</div>
        )}

        {data && !loading && (
          <>
            {/* Sales Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="総売上"
                value={formatCurrency(data.totals.totalRevenue)}
                icon={<DollarSign size={18} />}
              />
              <StatCard
                label="注文数"
                value={`${data.totals.totalOrders}件`}
                icon={<ShoppingCart size={18} />}
              />
              <StatCard
                label="ユニーク顧客数"
                value={`${data.totals.uniqueCustomers}人`}
                icon={<Users size={18} />}
              />
              <StatCard
                label="平均注文額"
                value={formatCurrency(data.totals.avgOrderValue)}
                icon={<TrendingUp size={18} />}
              />
            </div>

            {/* Customer CRM Cards */}
            {customerStats && customerStats.totalCustomers > 0 && (
              <>
                <h3 className="text-sm font-medium text-text-secondary">顧客分析</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard
                    label="リピート率"
                    value={`${customerStats.repeatRate}%`}
                    icon={<Repeat size={18} />}
                  />
                  <StatCard
                    label="平均LTV"
                    value={formatCurrency(customerStats.avgLTV)}
                    icon={<TrendingUp size={18} />}
                  />
                  <StatCard
                    label="購入顧客数"
                    value={`${customerStats.customersWithPurchases} / ${customerStats.totalCustomers}人`}
                    icon={<UserCheck size={18} />}
                  />
                </div>

                {/* Segment Distribution Bar */}
                <div className="bg-white rounded-xl border border-border p-4">
                  <h3 className="text-sm font-medium text-text mb-3">セグメント分布</h3>
                  <div className="flex rounded-full overflow-hidden h-3 bg-surface-secondary">
                    {(['new', 'active', 'lapsed'] as const).map((seg) => {
                      const count = customerStats.segments[seg];
                      const pct = customerStats.totalCustomers > 0
                        ? (count / customerStats.totalCustomers) * 100
                        : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={seg}
                          className={`${SEGMENT_BAR_COLORS[seg]} transition-all`}
                          style={{ width: `${pct}%` }}
                          title={`${SEGMENT_LABELS[seg]}: ${count}人 (${Math.round(pct)}%)`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2">
                    {(['new', 'active', 'lapsed'] as const).map((seg) => (
                      <div key={seg} className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <div className={`w-2.5 h-2.5 rounded-full ${SEGMENT_BAR_COLORS[seg]}`} />
                        {SEGMENT_LABELS[seg]}: {customerStats.segments[seg]}人
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart data={data.daily} />
              <ProductBreakdown data={data.daily} />
            </div>

            {/* Style Analytics */}
            {styleData && styleData.styles.length > 0 && (
              <StylePopularity data={styleData} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
