import { Check, X, Sparkles, TrendingUp, Users } from 'lucide-react';
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
      relative flex flex-col rounded-2xl bg-card border-2 transition-all duration-300 hover:shadow-xl group overflow-hidden
      ${isPopular ? 'border-primary ring-4 ring-primary/10 md:scale-105 shadow-lg z-10' : ''}
      ${isBestValue ? 'border-secondary ring-2 ring-secondary/10' : ''}
      ${!plan.badge ? 'border-border hover:border-primary/30' : ''}
    `}>
      {/* Badge */}
      {plan.badge && (
        <div className={`
          absolute -top-px left-0 right-0 text-center py-2 text-xs font-semibold flex items-center justify-center gap-1.5
          ${isPopular ? 'bg-gradient-to-r from-primary to-primary/80 text-white' : ''}
          ${isBestValue ? 'bg-gradient-to-r from-secondary to-secondary/80 text-white' : ''}
        `}>
          {isPopular && <Sparkles className="w-3 h-3" />}
          {isPopular ? '人気No.1' : ''}
          {isBestValue && <TrendingUp className="w-3 h-3" />}
          {isBestValue ? '最高コスパ' : ''}
        </div>
      )}

      <div className={`flex-1 flex flex-col p-8 ${plan.badge ? 'pt-12' : ''}`}>
        {/* Plan Name & Tagline */}
        <div className="mb-4">
          <h3 className="font-serif text-xl font-semibold text-foreground tracking-wide">
            {plan.name}
          </h3>
          {plan.tagline && (
            <p className="text-xs text-muted mt-1">{plan.tagline}</p>
          )}
        </div>

        {/* Price */}
        <div className="mb-2">
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold ${isPopular ? 'text-primary' : 'text-foreground'}`}>
              ¥{plan.price.toLocaleString()}
            </span>
            <span className="text-sm text-muted">（税込）</span>
          </div>
          {plan.priceExcludingTax && (
            <p className="text-xs text-muted mt-1">
              税抜 ¥{plan.priceExcludingTax.toLocaleString()}
            </p>
          )}
        </div>

        {/* Per-credit price — prominent */}
        <div className={`
          flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm font-medium
          ${isPopular ? 'bg-primary/10 text-primary' : isBestValue ? 'bg-secondary/10 text-secondary' : 'bg-muted/5 text-muted'}
        `}>
          1作品あたり <span className="text-lg font-bold">¥{plan.pricePerCredit.toLocaleString()}</span>
          {plan.savingsNote && !plan.badge && (
            <span className="ml-auto text-xs opacity-70">{plan.savingsNote}</span>
          )}
          {plan.savingsNote && plan.badge && (
            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPopular ? 'bg-primary/20' : 'bg-secondary/20'
            }`}>
              {plan.savingsNote}
            </span>
          )}
        </div>

        {/* Social proof for popular plan */}
        {plan.popularPercent && (
          <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-accent-sage/10 border border-accent-sage/20">
            <Users className="w-4 h-4 text-accent-sage" />
            <span className="text-sm text-accent-sage font-medium">
              {plan.popularPercent}%のお客様が選択
            </span>
          </div>
        )}

        {/* Key specs comparison */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-lg font-bold text-foreground">{plan.credits}</p>
            <p className="text-[10px] text-muted">生成回数</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-lg font-bold text-foreground">
              {plan.downloads === 'unlimited' ? '無制限' : plan.downloads}
            </p>
            <p className="text-[10px] text-muted">ダウンロード</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-lg font-bold text-foreground">
              {plan.styleCount === 'all' ? '全19' : plan.styleCount}
            </p>
            <p className="text-[10px] text-muted">スタイル</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background">
            {plan.hasWatermark ? (
              <>
                <div className="flex items-center justify-center">
                  <X className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-[10px] text-muted">透かしあり</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <Check className="w-4 h-4 text-accent-sage" />
                </div>
                <p className="text-[10px] text-muted">透かしなし</p>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <ul className="flex-1 space-y-2.5 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                isPopular ? 'text-primary' : isBestValue ? 'text-secondary' : 'text-accent-sage'
              }`} />
              <span className="text-sm text-muted leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Points */}
        {plan.pointsEarned && (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-secondary/10 to-secondary/5 rounded-xl mb-5 border border-secondary/20">
            <span className="text-sm text-secondary font-semibold">
              🎁 {plan.pointsEarned}ポイント還元
            </span>
          </div>
        )}

        {/* CTA */}
        <StyledButton
          variant={isPopular ? 'primary' : plan.badge ? 'outline' : 'outline'}
          className={`w-full ${isPopular ? 'shadow-lg shadow-primary/20' : ''}`}
        >
          {isPopular ? 'このプランで始める' : `${plan.name}を選ぶ`}
        </StyledButton>
      </div>
    </div>
  );
}
