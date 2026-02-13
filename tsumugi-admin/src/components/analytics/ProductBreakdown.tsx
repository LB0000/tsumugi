import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DailyAnalytics } from '../../types';

interface ProductBreakdownProps {
  data: DailyAnalytics[];
}

export function ProductBreakdown({ data }: ProductBreakdownProps) {
  const aggregated: Record<string, number> = {};
  for (const day of data) {
    for (const [product, count] of Object.entries(day.productBreakdown)) {
      aggregated[product] = (aggregated[product] || 0) + count;
    }
  }

  const chartData = Object.entries(aggregated)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold mb-4">商品別販売数</h3>
      <div className="h-72">
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
              width={140}
            />
            <Tooltip
              formatter={(value: number) => [`${value}個`, '販売数']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
