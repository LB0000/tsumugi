import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, Loader2, LogIn } from 'lucide-react';
import { StyledButton } from '../../components/common/StyledButton';
import { registerAuth, linkOrderToAccount } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { trackEvent } from '../../lib/analytics';

interface GuestAccountPromptProps {
  email: string;
  orderId: string;
}

type CompletionState =
  | { type: 'linked' }
  | { type: 'already_linked' }
  | { type: 'link_failed'; message: string };

export function GuestAccountPrompt({ email, orderId }: GuestAccountPromptProps) {
  const { setAuthSession } = useAuthStore();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionState | null>(null);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const rawName = email.split('@')[0]?.trim();
    const name = rawName && rawName.length > 0 ? rawName.slice(0, 50) : 'ゲスト';

    try {
      const response = await registerAuth({ name, email, password });
      setAuthSession(response.user, response.sessionToken);
      trackEvent('sign_up', { source: 'guest_checkout' });

      try {
        await linkOrderToAccount(orderId);
        setCompletion({ type: 'linked' });
      } catch (linkErr) {
        const linkMessage = linkErr instanceof Error ? linkErr.message : '';
        if (linkMessage.includes('既にアカウントに紐付け')) {
          setCompletion({ type: 'already_linked' });
        } else {
          setCompletion({ type: 'link_failed', message: linkMessage });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'アカウント作成に失敗しました';
      if (message.includes('既に登録') || message.includes('ALREADY') || message.includes('already')) {
        setError('existing_account');
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completion) {
    const isSuccess = completion.type === 'linked' || completion.type === 'already_linked';
    return (
      <div className="bg-accent-sage/10 border border-accent-sage/20 rounded-xl p-6 text-center">
        <CheckCircle className="w-8 h-8 text-accent-sage mx-auto mb-3" />
        <p className="font-medium text-foreground mb-1">アカウントを作成しました</p>
        {isSuccess ? (
          <p className="text-sm text-muted">次回から保存済みの住所やクーポンをご利用いただけます</p>
        ) : (
          <p className="text-sm text-muted">
            注文の紐付けに失敗しました。注文番号 <span className="font-mono">{orderId}</span> をお控えの上、
            <Link to="/support" className="text-primary hover:underline">サポート</Link>にお問い合わせください。
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
        次回のご注文がもっと便利に
      </h3>
      <p className="text-sm text-muted mb-5">
        パスワードを設定するだけでアカウントを作成できます
      </p>

      <form onSubmit={(e) => void handleCreateAccount(e)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">メールアドレス</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted/10 text-muted cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="guest-password" className="block text-sm font-medium text-foreground mb-1">
            パスワード
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              id="guest-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <StyledButton type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              作成中...
            </>
          ) : (
            'アカウントを作成'
          )}
        </StyledButton>

        {error === 'existing_account' ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-sale" role="alert">
              このメールアドレスは既に登録されています
            </p>
            <Link
              to="/login"
              state={{ returnTo: '/account' }}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <LogIn className="w-4 h-4" />
              ログインして注文履歴を確認
            </Link>
          </div>
        ) : error ? (
          <p className="text-sm text-sale text-center" role="alert">{error}</p>
        ) : null}
      </form>

      <p className="mt-4 text-xs text-muted text-center">
        アカウントを作成することで、
        <Link to="/terms" className="text-primary hover:underline">利用規約</Link>
        および
        <Link to="/privacy" className="text-primary hover:underline">プライバシーポリシー</Link>
        に同意したものとみなされます。
      </p>

      <ul className="mt-3 space-y-1.5 text-xs text-muted">
        <li className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-accent-sage shrink-0" />
          注文履歴の確認
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-accent-sage shrink-0" />
          住所の保存で次回入力不要
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-accent-sage shrink-0" />
          お得なクーポンの利用
        </li>
      </ul>
    </div>
  );
}
