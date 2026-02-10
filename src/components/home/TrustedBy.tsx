import { ImageIcon, Award, TrendingUp } from 'lucide-react';

const metrics = [
  { value: '10,000+', label: '作品を生成', icon: ImageIcon },
  { value: '4.9/5.0', label: '平均評価', icon: Award },
  { value: '98%', label: '満足度', icon: TrendingUp },
];

export function TrustedBy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-center text-xs text-muted uppercase tracking-[0.2em] mb-6">
        多くのお客様に選ばれています
      </p>

      <div className="grid grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="text-center">
              <Icon className="w-5 h-5 text-secondary mx-auto mb-2" />
              <div className="text-2xl sm:text-3xl font-serif font-bold text-primary mb-1">
                {metric.value}
              </div>
              <div className="text-xs sm:text-sm text-muted">{metric.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
