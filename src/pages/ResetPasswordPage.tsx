import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { StyledButton } from '../components/common/StyledButton';
import { resetPassword } from '../api';
import { useAuthStore } from '../stores/authStore';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthSession } = useAuthStore();

  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('リセットトークンが見つかりません。再度手続きを行ってください。');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('パスワードは8文字以上で入力してください。');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('確認用パスワードが一致しません。');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({ token, newPassword });
      setAuthSession(response.user, response.sessionToken);
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'パスワード再設定に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent-sage/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-accent-sage" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-foreground mb-3">
            パスワードを更新しました
          </h1>
          <p className="text-muted mb-6">
            新しいパスワードでログインしました。トップページへ移動できます。
          </p>
          <StyledButton onClick={() => navigate('/', { replace: true })}>
            トップページへ
          </StyledButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="font-serif text-3xl font-semibold text-primary tracking-wider">
              TSUMUGI
            </span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <h1 className="font-serif text-xl font-semibold text-foreground mb-2 text-center">
            新しいパスワードを設定
          </h1>
          <p className="text-sm text-muted text-center mb-6">
            8文字以上の新しいパスワードを入力してください。
          </p>

          {!token && (
            <div className="rounded-lg border border-sale/30 bg-sale/10 px-4 py-3 mb-5">
              <p className="text-sm text-sale">
                リセットトークンが見つかりません。再度メール送信からやり直してください。
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">
                新しいパスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                確認用パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <StyledButton type="submit" className="w-full" size="lg" disabled={isSubmitting || !token}>
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  パスワードを更新
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </StyledButton>

            {errorMessage && (
              <p className="text-sm text-sale text-center" role="alert">
                {errorMessage}
              </p>
            )}
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary hover:underline">
              ログインページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
