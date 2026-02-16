import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { StyleAnalyticsData } from '../../api';

interface StylePopularityProps {
  data: StyleAnalyticsData;
}

const CATEGORY_COLORS: Record<string, string> = {
  pets: '#3b82f6',
  family: '#10b981',
  kids: '#f472b6',
};

const CATEGORY_LABELS: Record<string, string> = {
  pets: 'ペット',
  family: 'ファミリー',
  kids: 'キッズ',
};

export function StylePopularity({ data }: StylePopularityProps) {
  const chartData = data.styles
    .slice(0, 15)
    .map((s) => ({
      name: s.styleName,
      count: s.count,
      category: s.category,
    }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4">スタイル別生成数</h3>
        <p className="text-text-secondary text-sm py-8 text-center">データがありません</p>
      </div>
    );
  }

  const presentCategories = [...new Set(chartData.map((d) => d.category))];

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold">スタイル別生成数</h3>
        <span className="text-xs text-text-secondary">合計 {data.totalGenerations} 回</span>
      </div>
      <div style={{ height: Math.max(200, chartData.length * 28 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip
              formatter={(value: number) => [`${value}回`, '生成数']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell key={`${entry.name}-${entry.category}`} fill={CATEGORY_COLORS[entry.category] || '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-3">
        {presentCategories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }} />
            {CATEGORY_LABELS[cat] || cat}
          </div>
        ))}
      </div>
    </div>
  );
}
