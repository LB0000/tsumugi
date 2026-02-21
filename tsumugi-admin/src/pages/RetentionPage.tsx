import { useState, useEffect, useCallback } from 'react';
import { TrendingDown, Clock, AlertTriangle, Repeat, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/analytics/StatCard';
import { getRetentionSummary, getRetentionCohorts, getRetentionLtv, getRetentionAtRisk } from '../api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { RetentionSummary, CohortRow, LtvBucket, AtRiskCustomer } from '../types';

export function RetentionPage() {
  const [summary, setSummary] = useState<RetentionSummary | null>(null);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [ltv, setLtv] = useState<LtvBucket[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, cohortsData, ltvData, atRiskData] = await Promise.all([
        getRetentionSummary(),
        getRetentionCohorts(),
        getRetentionLtv(),
        getRetentionAtRisk(),
      ]);
      setSummary(summaryData);
      setCohorts(cohortsData);
      setLtv(ltvData);
      setAtRisk(atRiskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div>
      <Header title="リテンション分析" />
      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-danger p-4 rounded-xl text-sm">{error}</div>
        )}

        {summary && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="チャーン率"
                value={`${summary.churnRate}%`}
                icon={<TrendingDown size={18} />}
              />
              <StatCard
                label="初回購入までの平均日数"
                value={summary.avgDaysToFirstPurchase !== null ? `${summary.avgDaysToFirstPurchase}日` : '-'}
                icon={<Clock size={18} />}
              />
              <StatCard
                label="離脱リスク顧客"
                value={`${summary.atRiskCount}人`}
                icon={<AlertTriangle size={18} />}
              />
              <StatCard
                label="平均注文頻度"
                value={`${summary.avgOrderFrequency}回`}
                icon={<Repeat size={18} />}
              />
            </div>

            {/* Cohort Analysis Table */}
            {cohorts.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 size={16} />
                  コホート分析
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="pb-2 pr-4 font-medium">登録月</th>
                        <th className="pb-2 pr-4 font-medium text-right">登録数</th>
                        <th className="pb-2 pr-4 font-medium text-right">購入転換率</th>
                        <th className="pb-2 pr-4 font-medium text-right">リピート率</th>
                        <th className="pb-2 pr-4 font-medium text-right">売上</th>
                        <th className="pb-2 font-medium text-right">初回購入日数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohorts.map((row) => {
                        const convRate = row.total > 0
                          ? Math.round((row.converted / row.total) * 100)
                          : 0;
                        const repeatRate = row.converted > 0
                          ? Math.round((row.repeated / row.converted) * 100)
                          : 0;
                        return (
                          <tr key={row.cohort} className="border-b border-border/50">
                            <td className="py-2.5 pr-4 font-medium">{row.cohort}</td>
                            <td className="py-2.5 pr-4 text-right">{row.total}</td>
                            <td className="py-2.5 pr-4 text-right">
                              <span
                                className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: convRate >= 50
                                    ? `rgba(34, 197, 94, ${Math.min(convRate / 100, 0.3)})`
                                    : `rgba(239, 68, 68, ${Math.min((100 - convRate) / 200, 0.3)})`,
                                  color: convRate >= 50 ? '#15803d' : '#dc2626',
                                }}
                              >
                                {convRate}%
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-right">{repeatRate}%</td>
                            <td className="py-2.5 pr-4 text-right">{formatCurrency(row.revenue)}</td>
                            <td className="py-2.5 text-right">
                              {row.avgDaysToFirstPurchase !== null ? `${row.avgDaysToFirstPurchase}日` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* LTV Distribution Chart */}
            {ltv.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold mb-4">LTV分布</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ltv}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="bucket" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === 'count' ? `${value}人` : formatCurrency(value),
                          name === 'count' ? '顧客数' : '売上',
                        ]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* At-Risk Customers */}
            {atRisk.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  離脱リスク顧客（60日以上未購入）
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="pb-2 pr-4 font-medium">名前</th>
                        <th className="pb-2 pr-4 font-medium">メール</th>
                        <th className="pb-2 pr-4 font-medium text-right">最終購入日</th>
                        <th className="pb-2 pr-4 font-medium text-right">経過日数</th>
                        <th className="pb-2 pr-4 font-medium text-right">注文数</th>
                        <th className="pb-2 font-medium text-right">累計支出</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRisk.map((customer) => (
                        <tr key={customer.id} className="border-b border-border/50">
                          <td className="py-2.5 pr-4 font-medium">{customer.name}</td>
                          <td className="py-2.5 pr-4 text-text-secondary">{customer.email}</td>
                          <td className="py-2.5 pr-4 text-right">{formatDate(customer.lastPurchaseAt)}</td>
                          <td className="py-2.5 pr-4 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                customer.daysSinceLastPurchase > 75
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {customer.daysSinceLastPurchase}日
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-right">{customer.totalOrders}回</td>
                          <td className="py-2.5 text-right">{formatCurrency(customer.totalSpent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
