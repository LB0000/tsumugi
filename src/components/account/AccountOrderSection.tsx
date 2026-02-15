import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Loader2, ArrowRight, ChevronDown, ExternalLink, MapPin } from 'lucide-react';
import { formatDate, formatAmount, getSafeReceiptUrl } from '../../utils/format';
import { getOrders, getOrderDetail } from '../../api';
import type { OrderHistoryItem } from '../../api';
import type { AuthUser } from '../../types';

const statusLabels: Record<string, string> = {
  PENDING: '処理待ち',
  COMPLETED: '完了',
  APPROVED: '承認済み',
  FAILED: '失敗',
  CANCELED: 'キャンセル',
};

interface Props {
  authUser: AuthUser;
}

export function AccountOrderSection({ authUser }: Props) {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedOrderDetail, setExpandedOrderDetail] = useState<OrderHistoryItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const userId = authUser.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void getOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch(() => {
        if (!cancelled) setFetchError('注文履歴の読み込みに失敗しました');
      })
      .finally(() => {
        if (!cancelled) setIsOrdersLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

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
      const fallback = orders.find((o) => o.orderId === orderId) ?? null;
      setExpandedOrderDetail(fallback);
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
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
      ) : fetchError ? (
        <div className="text-center py-8">
          <p className="text-sale text-sm">{fetchError}</p>
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
  );
}
