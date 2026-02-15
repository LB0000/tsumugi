import { useState } from 'react';
import { Lock, Loader2, Check } from 'lucide-react';
import { StyledButton } from '../common/StyledButton';
import { changePassword } from '../../api';

interface Props {
  isGoogleOnly: boolean;
}

export function AccountPasswordSection({ isGoogleOnly }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (isGoogleOnly) return null;

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

  return (
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
  );
}
