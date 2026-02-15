import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { verifyEmailToken } from '../api';
import { useAuthStore } from '../stores/authStore';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { setAuthSession } = useAuthStore();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('認証トークンが見つかりません');
      return;
    }

    let cancelled = false;

    void verifyEmailToken(token)
      .then((result) => {
        if (cancelled) return;
        setStatus('success');
        setAuthSession(result.user);
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'メール認証に失敗しました');
      });

    return () => { cancelled = true; };
  }, [token, setAuthSession]);

  return (
    <div className="flex-1 bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-block mb-8">
          <span className="font-serif text-3xl font-semibold text-primary tracking-wider">
            TSUMUGI
          </span>
        </Link>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-foreground font-medium">メールアドレスを確認中...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <h2 className="text-lg font-semibold text-foreground">メール認証完了</h2>
              <p className="text-sm text-muted">
                メールアドレスの認証が完了しました。
              </p>
              <Link
                to="/"
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
              >
                トップページへ
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="w-12 h-12 text-sale" />
              <h2 className="text-lg font-semibold text-foreground">認証に失敗しました</h2>
              <p className="text-sm text-muted">
                {errorMessage}
              </p>
              <Link
                to="/login"
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
              >
                ログインページへ
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
