import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Package, Loader2, Check, ArrowRight, Mail } from 'lucide-react';
import { StyledButton } from '../components/common/StyledButton';
import { useAppStore } from '../stores/appStore';
import { updateProfile, changePassword, getOrders, resendVerification } from '../api';
import type { OrderHistoryItem } from '../api';

const statusLabels: Record<string, string> = {
  PENDING: '処理待ち',
  COMPLETED: '完了',
  APPROVED: '承認済み',
  FAILED: '失敗',
  CANCELED: 'キャンセル',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatAmount(amount?: number): string {
  if (amount == null) return '-';
  return `¥${amount.toLocaleString()}`;
}

export function AccountPage() {
  const navigate = useNavigate();
  const { authUser, setAuthSession } = useAppStore();

  // Profile
  const [editName, setEditName] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Orders
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

  // Verification
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) {
      navigate('/login', { replace: true });
      return;
    }
    setEditName(authUser.name);
  }, [authUser, navigate]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;

    void getOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch(() => {
        // Silently fail - order history not critical
      })
      .finally(() => {
        if (!cancelled) setIsOrdersLoading(false);
      });

    return () => { cancelled = true; };
  }, [authUser]);

  if (!authUser) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsProfileSaving(true);

    try {
      const result = await updateProfile({ name: editName.trim() });
      setAuthSession(result.user);
      setProfileMessage({ type: 'success', text: 'プロフィールを更新しました' });
    } catch (error) {
      setProfileMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'プロフィールの更新に失敗しました',
      });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '新しいパスワードが一致しません' });
      return;
    }

    setIsPasswordSaving(true);

    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({ type: 'success', text: 'パスワードを変更しました' });
    } catch (error) {
      setPasswordMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'パスワード変更に失敗しました',
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const isGoogleOnly = authUser.authProvider === 'google';

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage(null);
    try {
      await resendVerification();
      setResendMessage('認証メールを再送信しました');
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : '再送信に失敗しました');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex-1 bg-background py-8 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">マイページ</h1>
          <p className="text-sm text-muted mt-1">アカウント情報の確認・編集ができます</p>
        </div>

        {/* Email Verification Banner */}
        {!authUser.emailVerified && authUser.authProvider === 'email' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">メールアドレスが未認証です</p>
                <p className="text-xs text-yellow-700 mt-1">
                  登録時に送信された確認メールのリンクをクリックしてください。
                </p>
                <button
                  onClick={() => void handleResendVerification()}
                  disabled={isResending}
                  className="mt-2 text-xs text-yellow-800 underline hover:no-underline disabled:opacity-50"
                >
                  {isResending ? '送信中...' : '認証メールを再送信する'}
                </button>
                {resendMessage && (
                  <p className="text-xs text-yellow-700 mt-1">{resendMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Section */}
        <section className="bg-card rounded-2xl border border-border p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">プロフィール</h2>
              <p className="text-xs text-muted">
                {isGoogleOnly ? 'Googleアカウントで登録' : 'メールアドレスで登録'}
              </p>
            </div>
          </div>

          <form onSubmit={(e) => void handleProfileSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-foreground mb-2">
                お名前
              </label>
              <input
                id="profile-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                required
                maxLength={80}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                メールアドレス
              </label>
              <div className="px-4 py-3 border border-border rounded-lg bg-card-hover text-muted text-sm">
                {authUser.email}
              </div>
            </div>

            <StyledButton type="submit" size="sm" disabled={isProfileSaving || editName.trim() === authUser.name}>
              {isProfileSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />保存中...</>
              ) : (
                '変更を保存'
              )}
            </StyledButton>

            {profileMessage && (
              <p className={`text-sm ${profileMessage.type === 'success' ? 'text-green-600' : 'text-sale'}`}>
                {profileMessage.type === 'success' && <Check className="w-4 h-4 inline mr-1" />}
                {profileMessage.text}
              </p>
            )}
          </form>
        </section>

        {/* Password Section */}
        {!isGoogleOnly && (
          <section className="bg-card rounded-2xl border border-border p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-secondary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">パスワード変更</h2>
            </div>

            <form onSubmit={(e) => void handlePasswordSubmit(e)} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-foreground mb-2">
                  現在のパスワード
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-foreground mb-2">
                  新しいパスワード
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted mt-1">8文字以上で入力してください</p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground mb-2">
                  新しいパスワード（確認）
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                  minLength={8}
                />
              </div>

              <StyledButton
                type="submit"
                size="sm"
                disabled={isPasswordSaving || !currentPassword || !newPassword || !confirmPassword}
              >
                {isPasswordSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />変更中...</>
                ) : (
                  'パスワードを変更'
                )}
              </StyledButton>

              {passwordMessage && (
                <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-sale'}`}>
                  {passwordMessage.type === 'success' && <Check className="w-4 h-4 inline mr-1" />}
                  {passwordMessage.text}
                </p>
              )}
            </form>
          </section>
        )}

        {/* Order History Section */}
        <section className="bg-card rounded-2xl border border-border p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">注文履歴</h2>
          </div>

          {isOrdersLoading ? (
            <div className="flex items-center justify-center py-8 text-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              読み込み中...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted mb-4">まだ注文履歴がありません</p>
              <Link to="/" className="text-primary hover:underline text-sm inline-flex items-center gap-1">
                作品を作成する <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-card-hover transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      注文 #{order.orderId.slice(-8)}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {formatDate(order.createdAt || order.updatedAt)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-semibold text-foreground">
                      {formatAmount(order.totalAmount)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'COMPLETED' || order.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'FAILED' || order.status === 'CANCELED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Back */}
        <div className="text-center mt-8">
          <Link to="/" className="text-sm text-muted hover:text-primary transition-colors">
            ← トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
