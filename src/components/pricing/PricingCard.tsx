import { Check, Gift, Sparkles } from 'lucide-react';
import type { PricingPlan } from '../../types';
import { StyledButton } from '../common/StyledButton';

interface PricingCardProps {
  plan: PricingPlan;
}

export function PricingCard({ plan }: PricingCardProps) {
  const isPopular = plan.badge === 'popular';
  const isBestValue = plan.badge === 'best-value';

  return (
    <div className={`
      relative flex flex-col p-8 rounded-2xl bg-card border-2 transition-all duration-300 hover:shadow-xl group
      ${isPopular ? 'border-primary ring-4 ring-primary/10 scale-105 shadow-lg' : ''}
      ${isBestValue ? 'border-secondary ring-2 ring-secondary/10' : ''}
      ${!plan.badge ? 'border-border hover:border-primary/30' : ''}
    `}>
      {/* Badge */}
      {plan.badge && (
        <div className={`
          absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md
          ${isPopular ? 'bg-gradient-to-r from-primary to-primary/80 text-white' : ''}
          ${isBestValue ? 'bg-gradient-to-r from-secondary to-secondary/80 text-white' : ''}
        `}>
          {isPopular && <Sparkles className="w-3 h-3" />}
          {isPopular ? '人気No.1' : '最高コスパ'}
        </div>
      )}

      {/* Plan Name */}
      <h3 className="font-serif text-xl font-semibold text-foreground mb-4 tracking-wide">
        {plan.name}
      </h3>

      {/* Price */}
      <div className="mb-4 pb-4 border-b border-border/50">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">¥{plan.price.toLocaleString()}</span>
          <span className="text-sm text-muted">（税込）</span>
        </div>
        {plan.priceExcludingTax && (
          <p className="text-xs text-muted mt-1">
            税抜価格: ¥{plan.priceExcludingTax.toLocaleString()}
          </p>
        )}
      </div>

      {/* Credits */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isPopular ? 'bg-primary/10' : isBestValue ? 'bg-secondary/10' : 'bg-muted/10'
        }`}>
          <span className="text-lg font-bold text-primary">{plan.credits}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">クレジット</p>
          <p className="text-xs text-muted">1作品あたり¥{plan.pricePerCredit.toLocaleString()}</p>
        </div>
      </div>

      {/* Points */}
      {plan.pointsEarned && (
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-secondary/10 to-secondary/5 rounded-xl mb-5 border border-secondary/20">
          <Gift className="w-4 h-4 text-secondary" />
          <span className="text-sm text-secondary font-semibold">
            {plan.pointsEarned}ポイント還元
          </span>
        </div>
      )}

      {/* Features */}
      <ul className="flex-1 space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-accent-sage/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-accent-sage" />
            </div>
            <span className="text-sm text-muted leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <StyledButton
        variant={plan.badge ? 'primary' : 'outline'}
        className={`w-full ${isPopular ? 'shadow-lg shadow-primary/20' : ''}`}
      >
        {plan.name}を購入
      </StyledButton>
    </div>
  );
}
