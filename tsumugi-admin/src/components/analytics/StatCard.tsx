import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  change?: string;
  positive?: boolean;
}

export function StatCard({ label, value, icon, change, positive }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-text-secondary">{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {change && (
        <p className={`text-xs mt-1.5 ${positive ? 'text-success' : 'text-danger'}`}>
          {change}
        </p>
      )}
    </div>
  );
}
