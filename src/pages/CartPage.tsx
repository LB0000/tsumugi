import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StyledButton, Breadcrumb, TrustBadges } from '../components/common';

// ダミーデータ（実際はZustandストアから取得）
const cartItems = [
  {
    id: '1',
    name: 'ペット肖像画 - ルネサンス貴族',
    style: 'ルネサンス貴族',
    thumbnail: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop',
    price: 2900,
    quantity: 1
  }
];

export function CartPage() {
  const isEmpty = cartItems.length === 0;
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 5000 ? 0 : 500;
  const total = subtotal + shipping;

  return (
    <div className="flex-1 bg-background">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Breadcrumb items={[{ label: 'ショッピングカート' }]} />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="w-8 h-8 text-primary" />
            <h1 className="font-serif text-3xl font-semibold text-foreground">ショッピングカート</h1>
          </div>
          <p className="text-muted">
            {isEmpty ? 'カートは空です' : `${cartItems.length}点の商品`}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {isEmpty ? (
          /* 空のカート */
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-card flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-muted" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-3">
              カートに商品がありません
            </h2>
            <p className="text-muted mb-8 max-w-md mx-auto">
              素敵な肖像画を作成して、大切な思い出をアートに変えましょう。
            </p>
            <Link to="/">
              <StyledButton size="lg">
                作品を作成する
                <ArrowRight className="w-5 h-5" />
              </StyledButton>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カート商品リスト */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-card rounded-xl border border-border"
                >
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{item.name}</h3>
                    <p className="text-sm text-muted mb-3">スタイル: {item.style}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          aria-label="数量を減らす"
                          className="w-8 h-8 rounded-lg bg-card-hover flex items-center justify-center hover:bg-primary/10 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          aria-label="数量を増やす"
                          className="w-8 h-8 rounded-lg bg-card-hover flex items-center justify-center hover:bg-primary/10 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="font-semibold text-primary">¥{item.price.toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    aria-label="商品を削除"
                    className="self-start p-2 text-muted hover:text-sale transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* 注文サマリー */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
                <h3 className="font-semibold text-foreground mb-4">注文内容</h3>

                <div className="space-y-3 mb-4 pb-4 border-b border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">小計</span>
                    <span className="text-foreground">¥{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">送料</span>
                    <span className="text-foreground">
                      {shipping === 0 ? (
                        <span className="text-accent-sage">無料</span>
                      ) : (
                        `¥${shipping.toLocaleString()}`
                      )}
                    </span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-xs text-secondary">
                      あと¥{(5000 - subtotal).toLocaleString()}で送料無料！
                    </p>
                  )}
                </div>

                <div className="flex justify-between mb-6">
                  <span className="font-semibold text-foreground">合計（税込）</span>
                  <span className="text-xl font-bold text-primary">¥{total.toLocaleString()}</span>
                </div>

                <StyledButton className="w-full mb-4" size="lg">
                  レジに進む
                  <ArrowRight className="w-5 h-5" />
                </StyledButton>

                <Link to="/" className="block text-center text-sm text-primary hover:underline">
                  買い物を続ける
                </Link>

                {/* Trust badges */}
                <div className="mt-6 pt-4 border-t border-border">
                  <TrustBadges variant="vertical" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
