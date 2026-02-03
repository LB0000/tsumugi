import { useState } from 'react';
import { Send, Download, Truck, Edit, Sparkles, CreditCard, RefreshCw, HelpCircle } from 'lucide-react';
import { quickActions } from '../../data/pricingPlans';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'download': Download,
  'truck': Truck,
  'edit': Edit,
  'sparkles': Sparkles,
  'credit-card': CreditCard,
  'refresh-cw': RefreshCw,
  'help-circle': HelpCircle,
};

export function SupportChat() {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // Handle message submission
      console.log('Message:', message);
      setMessage('');
    }
  };

  const handleQuickAction = (actionId: string) => {
    // Handle quick action
    console.log('Quick action:', actionId);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="font-serif text-3xl font-semibold text-foreground mb-2">
          こんにちは
        </h2>
        <p className="text-muted">
          本日はどのようなご用件でしょうか？
        </p>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-3 rounded-[var(--radius-button)] bg-card border border-foreground/20 text-foreground placeholder:text-muted focus:outline-none focus:border-accent-green transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-3 rounded-[var(--radius-button)] bg-accent-green text-black hover:bg-accent-green/90 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Quick Actions */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3 min-w-max">
          {quickActions.map((action) => {
            const Icon = iconMap[action.icon] || HelpCircle;
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card hover:bg-card/80 transition-colors whitespace-nowrap"
              >
                <Icon className="w-4 h-4 text-accent-green" />
                <span className="text-sm text-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
