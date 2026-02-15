import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { StyledButton } from '../components/common/StyledButton';
import { forgotPassword } from '../api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState('メールを送信しました');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await forgotPassword({ email: email.trim() });
      setSubmittedMessage(response.message);
      setIsSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent-sage/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-accent-sage" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-foreground mb-3">
            {submittedMessage}
          </h1>
          <p className="text-muted mb-6">
            {email} 宛にパスワードリセット用のリンクを送信しました。
            メールをご確認ください。
          </p>
          <Link to="/login">
            <StyledButton>ログインページに戻る</StyledButton>
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="font-serif text-xl font-semibold text-foreground mb-2 text-center">
            パスワードをリセット
          </h1>
          <p className="text-sm text-muted text-center mb-6">
            登録済みのメールアドレスを入力してください。
            パスワードリセット用のリンクをお送りします。
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <StyledButton type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  リセットリンクを送信
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
            <Link to="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              ログインページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
