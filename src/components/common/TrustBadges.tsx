import { Shield, Truck, RefreshCcw, CreditCard, Lock } from 'lucide-react';

interface TrustBadgesProps {
  variant?: 'horizontal' | 'vertical' | 'compact' | 'payment-only';
  showLabels?: boolean;
  className?: string;
}

// 決済方法のSVGアイコン（簡略化版）
const PaymentIcons = {
  visa: (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="Visa">
      <rect fill="#1A1F71" width="48" height="32" rx="4" />
      <text x="24" y="20" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">VISA</text>
    </svg>
  ),
  mastercard: (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="Mastercard">
      <rect fill="#F7F7F7" width="48" height="32" rx="4" />
      <circle cx="18" cy="16" r="10" fill="#EB001B" />
      <circle cx="30" cy="16" r="10" fill="#F79E1B" />
      <path d="M24 8.5a10 10 0 010 15" fill="#FF5F00" />
    </svg>
  ),
  jcb: (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="JCB">
      <rect fill="#0066CC" width="48" height="32" rx="4" />
      <text x="24" y="20" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">JCB</text>
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="American Express">
      <rect fill="#006FCF" width="48" height="32" rx="4" />
      <text x="24" y="20" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">AMEX</text>
    </svg>
  ),
  paypay: (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="PayPay">
      <rect fill="#FF0033" width="48" height="32" rx="4" />
      <text x="24" y="20" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">PayPay</text>
    </svg>
  ),
};

const trustItems = [
  {
    icon: Shield,
    label: 'SSL暗号化',
    description: '安全なお支払い',
    color: 'text-accent-sage',
    bgColor: 'bg-accent-sage/10',
  },
  {
    icon: Truck,
    label: '送料無料',
    description: '5,000円以上',
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    icon: RefreshCcw,
    label: '返品保証',
    description: '30日間',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

export function TrustBadges({
  variant = 'horizontal',
  showLabels = true,
  className = '',
}: TrustBadgesProps) {
  // Payment icons only
  if (variant === 'payment-only') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Lock className="w-4 h-4 text-muted" />
        <div className="flex items-center gap-1.5">
          {Object.entries(PaymentIcons).map(([key, icon]) => (
            <div key={key} className="opacity-70 hover:opacity-100 transition-opacity">
              {icon}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Compact variant - icons only in a row
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {trustItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-1.5 text-xs text-muted"
            title={`${item.label}: ${item.description}`}
          >
            <item.icon className={`w-4 h-4 ${item.color}`} />
            {showLabels && <span>{item.label}</span>}
          </div>
        ))}
      </div>
    );
  }

  // Vertical variant
  if (variant === 'vertical') {
    return (
      <div className={`space-y-3 ${className}`}>
        {trustItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            {showLabels && (
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted">{item.description}</p>
              </div>
            )}
          </div>
        ))}

        {/* Payment methods */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted mb-2 flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            対応決済方法
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(PaymentIcons).map(([key, icon]) => (
              <div key={key} className="opacity-70 hover:opacity-100 transition-opacity">
                {icon}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default horizontal variant
  return (
    <div className={`flex flex-wrap items-center justify-center gap-6 ${className}`}>
      {trustItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${item.bgColor} flex items-center justify-center`}>
            <item.icon className={`w-4 h-4 ${item.color}`} />
          </div>
          {showLabels && (
            <div>
              <p className="text-xs font-medium text-foreground">{item.label}</p>
              <p className="text-[10px] text-muted">{item.description}</p>
            </div>
          )}
        </div>
      ))}

      {/* Divider */}
      <div className="h-8 w-px bg-border hidden sm:block" />

      {/* Payment icons */}
      <div className="flex items-center gap-1.5">
        {Object.entries(PaymentIcons).map(([key, icon]) => (
          <div key={key} className="opacity-70 hover:opacity-100 transition-opacity">
            {icon}
          </div>
        ))}
      </div>
    </div>
  );
}
