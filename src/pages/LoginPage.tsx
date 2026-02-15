import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2 } from 'lucide-react';
import { StyledButton } from '../components/common/StyledButton';
import { loginAuth, registerAuth, loginWithGoogle } from '../api';
import { useAuthStore } from '../stores/authStore';
import { config } from '../config';

const GOOGLE_CLIENT_ID = config.googleClientId;

export function LoginPage() {
  const navigate = useNavigate();
  const { authUser, setAuthSession } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authUser) {
      navigate('/', { replace: true });
    }
  }, [authUser, navigate]);

  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle(response.credential);
      setAuthSession(result.user);
      navigate('/', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Googleログインに失敗しました';
      setErrorMessage(message);
      if (message.includes('メール・パスワード')) {
        setIsLogin(true);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, [setAuthSession, navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || authUser) return;

    const scriptId = 'google-gsi-script';
    if (document.getElementById(scriptId)) {
      // Script already loaded, just initialize
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: googleButtonRef.current.offsetWidth,
            text: 'continue_with',
            locale: 'ja',
          });
        }
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts?.id?.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      if (googleButtonRef.current) {
        window.google?.accounts?.id?.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleButtonRef.current.offsetWidth,
          text: 'continue_with',
          locale: 'ja',
        });
      }
    };
    document.head.appendChild(script);
  }, [handleGoogleResponse, authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const response = await loginAuth({
          email: email.trim(),
          password,
        });
        setAuthSession(response.user);
        navigate('/', { replace: true });
      } else {
        const normalizedName = name.trim();
        if (normalizedName.length === 0) {
          throw new Error('お名前を入力してください');
        }

        const response = await registerAuth({
          name: normalizedName,
          email: email.trim(),
          password,
        });
        setAuthSession(response.user);
        setSuccessMessage('登録完了！確認メールを送信しました。メールのリンクをクリックして認証を完了してください。');
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '認証処理に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="font-serif text-3xl font-semibold text-primary tracking-wider">
              TSUMUGI
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          {/* Tabs */}
          <div className="flex mb-8 border-b border-border">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrorMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                isLogin ? 'text-primary' : 'text-muted hover:text-foreground'
              }`}
            >
              ログイン
              {isLogin && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setErrorMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                !isLogin ? 'text-primary' : 'text-muted hover:text-foreground'
              }`}
            >
              新規登録
              {!isLogin && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {/* Name (Register only) */}
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  お名前
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="山田 太郎"
                    className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-muted mt-1">8文字以上で入力してください</p>
              )}
            </div>

            {/* Forgot password (Login only) */}
            {isLogin && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  パスワードをお忘れですか？
                </Link>
              </div>
            )}

            {/* Submit */}
            <StyledButton type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  {isLogin ? 'ログイン' : '新規登録'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </StyledButton>

            {successMessage && (
              <p className="text-sm text-green-600 text-center" role="status">
                {successMessage}
              </p>
            )}

            {errorMessage && (
              <p className="text-sm text-sale text-center" role="alert">
                {errorMessage}
              </p>
            )}
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">または</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            {GOOGLE_CLIENT_ID ? (
              <>
                {isGoogleLoading && (
                  <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Googleアカウントで認証中...
                  </div>
                )}
                <div ref={googleButtonRef} className="flex justify-center" />
              </>
            ) : (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-lg opacity-50 cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-foreground">Googleで続ける（未設定）</span>
              </button>
            )}
          </div>

          {/* Terms */}
          {!isLogin && (
            <p className="text-xs text-muted text-center mt-6">
              新規登録することで、
              <Link to="/terms" className="text-primary hover:underline">利用規約</Link>
              および
              <Link to="/privacy" className="text-primary hover:underline">プライバシーポリシー</Link>
              に同意したものとみなされます。
            </p>
          )}
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted hover:text-primary transition-colors">
            ← トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
