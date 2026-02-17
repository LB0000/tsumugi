import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { StyledButton, Breadcrumb, TrustBadges } from '../components/common';

import { useCartStore } from '../stores/cartStore';
import { SHIPPING_FREE_THRESHOLD, SHIPPING_FLAT_FEE, MAX_ITEM_QUANTITY } from '../data/shipping';
import { products, type Product } from '../data/products';

const featuredProducts = [
  products.find((p) => p.id === 'acrylic-stand'),
  products.find((p) => p.id === 'canvas'),
].filter((p): p is Product => p !== undefined);

export function CartPage() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateCartItemQuantity } = useCartStore();
  const isEmpty = cartItems.length === 0;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT_FEE;
  const total = subtotal + shipping;
  const remaining = SHIPPING_FREE_THRESHOLD - subtotal;
  const progress = Math.min(subtotal / SHIPPING_FREE_THRESHOLD, 1);

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
            {isEmpty ? 'カートは空です' : `${itemCount}点の商品`}
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
              まずは写真をアップロードして作品を作りましょう。
            </p>
            <Link to="/">
              <StyledButton size="lg">
                作品を作成する
                <ArrowRight className="w-5 h-5" />
              </StyledButton>
            </Link>

            {/* 人気商品の紹介 */}
            {featuredProducts.length > 0 && (
              <div className="mt-12 max-w-lg mx-auto">
                <p className="text-sm text-muted mb-4">こんな商品が選ばれています</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featuredProducts.map((product) => (
                    <Link
                      key={product.id}
                      to="/"
                      className="p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors text-left"
                    >
                      <p className="font-semibold text-foreground text-sm">{product.name}</p>
                      <p className="text-primary font-bold text-sm mt-1">¥{product.price.toLocaleString()}</p>
                      <p className="text-xs text-muted mt-1">{product.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
          {/* 送料無料プログレスバー */}
          <div className="mb-6 p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-accent-sage" />
              {remaining > 0 ? (
                <p className="text-sm text-foreground">
                  あと<span className="font-bold text-primary">¥{remaining.toLocaleString()}</span>で送料無料
                </p>
              ) : (
                <p className="text-sm font-medium text-accent-sage">送料無料の対象です</p>
              )}
            </div>
            <div
              className="w-full h-2 bg-border rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={remaining > 0 ? `送料無料まであと${remaining.toLocaleString()}円` : '送料無料'}
            >
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary to-accent-sage"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カート商品リスト */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-card rounded-xl border border-border"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.artStyleName}
                    className="w-24 h-24 object-cover rounded-lg bg-card"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{item.name}</h3>
                    <p className="text-sm text-muted mb-3">スタイル: {item.artStyleName || 'Standard'}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="数量を減らす"
                          className="w-8 h-8 rounded-lg bg-card-hover flex items-center justify-center hover:bg-primary/10 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= MAX_ITEM_QUANTITY}
                          aria-label="数量を増やす"
                          className="w-8 h-8 rounded-lg bg-card-hover flex items-center justify-center hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted">¥{item.price.toLocaleString()} / 点</p>
                        <p className="font-semibold text-primary">¥{(item.price * item.quantity).toLocaleString()}</p>
                        {item.quantity >= MAX_ITEM_QUANTITY && (
                          <p className="text-xs text-muted">数量上限（{MAX_ITEM_QUANTITY}点）</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
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
                </div>

                <div className="flex justify-between mb-6">
                  <span className="font-semibold text-foreground">合計（税込）</span>
                  <span className="text-xl font-bold text-primary">¥{total.toLocaleString()}</span>
                </div>

                <StyledButton className="w-full mb-4" size="lg" onClick={() => navigate('/checkout')}>
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
          </>
        )}
      </div>
    </div>
  );
}
