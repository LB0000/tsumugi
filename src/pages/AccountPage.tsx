import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Package, Loader2, Check, ArrowRight, Mail, ChevronDown, ExternalLink, MapPin, Plus, Trash2, Image, X } from 'lucide-react';
import { StyledButton } from '../components/common/StyledButton';
import { useAppStore } from '../stores/appStore';
import { updateProfile, changePassword, getOrders, getOrderDetail, getAddresses, saveAddress, deleteAddress, getGallery, getGalleryThumbnailUrl, getGalleryImageUrl, deleteGalleryItem, resendVerification } from '../api';
import type { OrderHistoryItem, SavedAddressItem, GalleryItemData } from '../api';

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

function getSafeReceiptUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
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

  // Order detail expansion
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedOrderDetail, setExpandedOrderDetail] = useState<OrderHistoryItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Saved addresses
  const [addresses, setAddresses] = useState<SavedAddressItem[]>([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [addressMessage, setAddressMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newAddr, setNewAddr] = useState({
    label: '', lastName: '', firstName: '', email: '', phone: '',
    postalCode: '', prefecture: '', city: '', addressLine: '', isDefault: false,
  });

  // Gallery
  const [galleryItems, setGalleryItems] = useState<GalleryItemData[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;

    void getAddresses()
      .then((data) => {
        if (!cancelled) setAddresses(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsAddressesLoading(false);
      });

    return () => { cancelled = true; };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;

    void getGallery()
      .then((data) => {
        if (!cancelled) setGalleryItems(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsGalleryLoading(false);
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

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressMessage(null);
    setIsAddressSaving(true);

    try {
      const saved = await saveAddress(newAddr);
      setAddresses((prev) => [...prev, saved]);
      setNewAddr({ label: '', lastName: '', firstName: '', email: '', phone: '', postalCode: '', prefecture: '', city: '', addressLine: '', isDefault: false });
      setShowAddressForm(false);
      setAddressMessage({ type: 'success', text: '配送先を保存しました' });
    } catch (error) {
      setAddressMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '配送先の保存に失敗しました',
      });
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleDeleteGalleryItem = async (itemId: string) => {
    try {
      await deleteGalleryItem(itemId);
      setGalleryItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {
      // Silently fail
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await deleteAddress(addressId);
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
    } catch (error) {
      setAddressMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '配送先の削除に失敗しました',
      });
    }
  };

  const handleToggleOrderDetail = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setExpandedOrderDetail(null);
      return;
    }

    setExpandedOrderId(orderId);
    setExpandedOrderDetail(null);
    setIsDetailLoading(true);

    try {
      const detail = await getOrderDetail(orderId);
      setExpandedOrderDetail(detail);
    } catch {
      // Fall back to the summary data from the list
      const fallback = orders.find((o) => o.orderId === orderId) ?? null;
      setExpandedOrderDetail(fallback);
    } finally {
      setIsDetailLoading(false);
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

        {/* Saved Addresses Section */}
        <section className="bg-card rounded-2xl border border-border p-6 sm:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">配送先</h2>
            </div>
            {addresses.length < 3 && !showAddressForm && (
              <button
                type="button"
                onClick={() => { setShowAddressForm(true); setAddressMessage(null); }}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />追加
              </button>
            )}
          </div>

          {addressMessage && (
            <p className={`text-sm mb-4 ${addressMessage.type === 'success' ? 'text-green-600' : 'text-sale'}`}>
              {addressMessage.type === 'success' && <Check className="w-4 h-4 inline mr-1" />}
              {addressMessage.text}
            </p>
          )}

          {isAddressesLoading ? (
            <div className="flex items-center justify-center py-6 text-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />読み込み中...
            </div>
          ) : addresses.length === 0 && !showAddressForm ? (
            <div className="text-center py-6">
              <p className="text-muted mb-3">配送先が登録されていません</p>
              <button
                type="button"
                onClick={() => setShowAddressForm(true)}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />配送先を追加する
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="flex items-start justify-between p-4 rounded-xl border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">デフォルト</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{addr.lastName} {addr.firstName}</p>
                    <p className="text-xs text-muted">〒{addr.postalCode} {addr.prefecture}{addr.city}{addr.addressLine}</p>
                    <p className="text-xs text-muted">{addr.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAddress(addr.id)}
                    className="text-muted hover:text-sale transition-colors p-1"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add address form */}
          {showAddressForm && (
            <form onSubmit={(e) => void handleSaveAddress(e)} className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">ラベル</label>
                  <input
                    type="text"
                    placeholder="自宅・会社など"
                    value={newAddr.label}
                    onChange={(e) => setNewAddr((p) => ({ ...p, label: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">姓</label>
                  <input
                    type="text"
                    value={newAddr.lastName}
                    onChange={(e) => setNewAddr((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">名</label>
                  <input
                    type="text"
                    value={newAddr.firstName}
                    onChange={(e) => setNewAddr((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">メール</label>
                  <input
                    type="email"
                    value={newAddr.email}
                    onChange={(e) => setNewAddr((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={newAddr.phone}
                    onChange={(e) => setNewAddr((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">郵便番号</label>
                  <input
                    type="text"
                    value={newAddr.postalCode}
                    onChange={(e) => setNewAddr((p) => ({ ...p, postalCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">都道府県</label>
                  <input
                    type="text"
                    value={newAddr.prefecture}
                    onChange={(e) => setNewAddr((p) => ({ ...p, prefecture: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">市区町村</label>
                  <input
                    type="text"
                    value={newAddr.city}
                    onChange={(e) => setNewAddr((p) => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">番地・建物名</label>
                  <input
                    type="text"
                    value={newAddr.addressLine}
                    onChange={(e) => setNewAddr((p) => ({ ...p, addressLine: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAddr.isDefault}
                      onChange={(e) => setNewAddr((p) => ({ ...p, isDefault: e.target.checked }))}
                      className="rounded border-border"
                    />
                    デフォルトに設定
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <StyledButton type="submit" size="sm" disabled={isAddressSaving}>
                  {isAddressSaving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</> : '保存'}
                </StyledButton>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="text-sm text-muted hover:text-foreground transition-colors px-3"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}
        </section>

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
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.orderId;
                const detail = isExpanded ? expandedOrderDetail : null;
                const safeReceiptUrl = getSafeReceiptUrl(detail?.receiptUrl);

                return (
                  <div key={order.orderId} className="rounded-xl border border-border overflow-hidden">
                    {/* Order summary row (clickable) */}
                    <button
                      type="button"
                      onClick={() => void handleToggleOrderDetail(order.orderId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-card-hover transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          注文 #{order.orderId.slice(-8)}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {formatDate(order.createdAt || order.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <div className="text-right">
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
                        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border bg-card-hover/50 p-4 space-y-4">
                        {isDetailLoading ? (
                          <div className="flex items-center justify-center py-4 text-muted">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            詳細を読み込み中...
                          </div>
                        ) : (
                          <>
                            {/* Items */}
                            {detail?.items && detail.items.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">商品</h4>
                                <div className="space-y-1.5">
                                  {detail.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                      <span className="text-foreground">{item.name} <span className="text-muted">× {item.quantity}</span></span>
                                      <span className="text-foreground font-medium">{formatAmount(item.price * item.quantity)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Shipping address */}
                            {detail?.shippingAddress && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />配送先
                                </h4>
                                <div className="text-sm text-foreground space-y-0.5">
                                  <p>{detail.shippingAddress.lastName} {detail.shippingAddress.firstName}</p>
                                  <p>〒{detail.shippingAddress.postalCode}</p>
                                  <p>{detail.shippingAddress.prefecture}{detail.shippingAddress.city}{detail.shippingAddress.addressLine}</p>
                                  <p className="text-muted">{detail.shippingAddress.phone}</p>
                                </div>
                              </div>
                            )}

                            {/* Receipt URL */}
                            {safeReceiptUrl && (
                              <div>
                                <a
                                  href={safeReceiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  領収書を表示
                                </a>
                              </div>
                            )}

                            {/* No detail data message */}
                            {!detail?.items?.length && !detail?.shippingAddress && !safeReceiptUrl && (
                              <p className="text-sm text-muted text-center py-2">詳細情報はありません</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Gallery Section */}
        <section className="bg-card rounded-2xl border border-border p-6 sm:p-8 mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">生成作品ギャラリー</h2>
              <p className="text-xs text-muted">画像生成時に自動保存されます（最大20件）</p>
            </div>
          </div>

          {isGalleryLoading ? (
            <div className="flex items-center justify-center py-8 text-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />読み込み中...
            </div>
          ) : galleryItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted mb-4">まだ生成した作品がありません</p>
              <Link to="/" className="text-primary hover:underline text-sm inline-flex items-center gap-1">
                作品を作成する <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryItems.map((item) => (
                <div key={item.id} className="group relative rounded-xl overflow-hidden border border-border">
                  <button
                    type="button"
                    onClick={() => setLightboxImage(getGalleryImageUrl(item.id))}
                    className="block w-full aspect-square"
                  >
                    <img
                      src={getGalleryThumbnailUrl(item.id)}
                      alt={item.artStyleName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white font-medium truncate">{item.artStyleName}</p>
                    <p className="text-[10px] text-white/70">{formatDate(item.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteGalleryItem(item.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    title="削除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lightbox Modal */}
        {lightboxImage && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="拡大表示"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

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
