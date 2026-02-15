import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  AccountProfileSection,
  AccountPasswordSection,
  AccountAddressSection,
  AccountOrderSection,
  AccountGallerySection,
} from '../components/account';

export function AccountPage() {
  const { authUser, setAuthSession } = useAuthStore();

  // ProtectedRoute already handles redirect to /login
  if (!authUser) return null;

  const isGoogleOnly = authUser.authProvider === 'google';

  return (
    <div className="flex-1 bg-background py-8 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">マイページ</h1>
          <p className="text-sm text-muted mt-1">アカウント情報の確認・編集ができます</p>
        </div>

        <AccountProfileSection authUser={authUser} onSessionUpdate={setAuthSession} />
        <AccountPasswordSection isGoogleOnly={isGoogleOnly} />
        <AccountAddressSection authUser={authUser} />
        <AccountOrderSection authUser={authUser} />
        <AccountGallerySection authUser={authUser} />

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
