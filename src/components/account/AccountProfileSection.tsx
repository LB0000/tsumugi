import { useState, useEffect } from 'react';
import { User, Loader2, Check, Mail } from 'lucide-react';
import { StyledButton } from '../common/StyledButton';
import { updateProfile, resendVerification } from '../../api';
import type { AuthUser } from '../../types';

interface Props {
  authUser: AuthUser;
  onSessionUpdate: (user: AuthUser) => void;
}

export function AccountProfileSection({ authUser, onSessionUpdate }: Props) {
  const [editName, setEditName] = useState(authUser.name);

  useEffect(() => {
    setEditName(authUser.name);
  }, [authUser.name]);

  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const isGoogleOnly = authUser.authProvider === 'google';

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsProfileSaving(true);

    try {
      const result = await updateProfile({ name: editName.trim() });
      onSessionUpdate(result.user);
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
    <>
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
    </>
  );
}
