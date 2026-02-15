import { useState, useEffect } from 'react';
import { MapPin, Loader2, Check, Plus, Trash2 } from 'lucide-react';
import { StyledButton } from '../common/StyledButton';
import { getAddresses, saveAddress, deleteAddress } from '../../api';
import type { SavedAddressItem } from '../../api';
import type { AuthUser } from '../../types';

interface Props {
  authUser: AuthUser;
}

export function AccountAddressSection({ authUser }: Props) {
  const [addresses, setAddresses] = useState<SavedAddressItem[]>([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [addressMessage, setAddressMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newAddr, setNewAddr] = useState({
    label: '', lastName: '', firstName: '', email: '', phone: '',
    postalCode: '', prefecture: '', city: '', addressLine: '', isDefault: false,
  });

  const userId = authUser.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void getAddresses()
      .then((data) => {
        if (!cancelled) setAddresses(data);
      })
      .catch(() => {
        if (!cancelled) setAddressMessage({ type: 'error', text: '配送先の読み込みに失敗しました' });
      })
      .finally(() => {
        if (!cancelled) setIsAddressesLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

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

  return (
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
  );
}
