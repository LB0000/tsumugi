// 送料定数 — サーバー側の server/lib/catalog.ts と同じ値を維持すること
export const SHIPPING_FREE_THRESHOLD = 5000;
export const SHIPPING_FLAT_FEE = 500;

// カート定数 — サーバー側の server/routes/checkout.ts と同じ値を維持すること
export const MAX_ITEM_QUANTITY = 10;

// カート有効期限（14日）
export const CART_TTL_MS = 14 * 24 * 60 * 60 * 1000;
