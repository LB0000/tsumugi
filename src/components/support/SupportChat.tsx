import { useEffect, useRef, useState } from 'react';
import { Send, Download, Truck, Edit, Sparkles, CreditCard, RefreshCw, HelpCircle, Loader2 } from 'lucide-react';
import { quickActions } from '../../data/pricingPlans';
import { sendSupportChat } from '../../api';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'download': Download,
  'truck': Truck,
  'edit': Edit,
  'sparkles': Sparkles,
  'credit-card': CreditCard,
  'refresh-cw': RefreshCw,
  'help-circle': HelpCircle,
};

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

export function SupportChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'ご利用ありがとうございます。配送・決済・ダウンロードに関するご質問にお答えします。',
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
  }, [messages, isSending]);

  const pushMessage = (nextMessage: ChatMessage) => {
    setMessages((prev) => [...prev, nextMessage]);
  };

  const requestSupportReply = async (payload: { message?: string; actionId?: string }) => {
    setIsSending(true);
    setError(null);
    try {
      const response = await sendSupportChat(payload);
      pushMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.reply,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'サポート送信に失敗しました';
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    pushMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    });
    setMessage('');
    await requestSupportReply({ message: trimmed });
  };

  const handleQuickAction = async (actionId: string) => {
    if (isSending) return;

    const selected = quickActions.find((action) => action.id === actionId);
    pushMessage({
      id: `user-action-${Date.now()}`,
      role: 'user',
      text: selected ? `クイック質問: ${selected.label}` : 'クイック質問を送信しました',
    });
    await requestSupportReply({ actionId });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="font-serif text-3xl font-semibold text-foreground mb-2">
          こんにちは
        </h2>
        <p className="text-muted">
          本日はどのようなご用件でしょうか？下の入力欄から質問できます。
        </p>
      </div>

      <div
        ref={messagesContainerRef}
        className="mb-6 bg-card border border-border rounded-2xl p-4 sm:p-5 max-h-[360px] overflow-y-auto space-y-3"
      >
        {messages.map((item) => (
          <div
            key={item.id}
            className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                item.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-background border border-border text-foreground'
              }`}
            >
              {item.text}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-background border border-border text-sm text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              回答を作成中...
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={(e) => void handleSubmit(e)} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-3 rounded-[var(--radius-button)] bg-card border border-foreground/20 text-foreground placeholder:text-muted focus:outline-none focus:border-accent-sage transition-colors"
            disabled={isSending}
          />
          <button
            type="submit"
            className="px-4 py-3 rounded-[var(--radius-button)] bg-accent-sage text-black hover:bg-accent-sage/90 transition-colors disabled:opacity-50"
            disabled={isSending || message.trim().length === 0}
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-sale">{error}</p>
        )}
      </form>

      {/* Quick Actions */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3 min-w-max">
          {quickActions.map((action) => {
            const Icon = iconMap[action.icon] || HelpCircle;
            return (
              <button
                key={action.id}
                onClick={() => void handleQuickAction(action.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card hover:bg-card/80 transition-colors whitespace-nowrap disabled:opacity-50"
                disabled={isSending}
              >
                <Icon className="w-4 h-4 text-accent-sage" />
                <span className="text-sm text-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
