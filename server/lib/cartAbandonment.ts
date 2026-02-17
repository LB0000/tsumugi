import path from 'path';
import { readJsonFile } from './persistence.js';
import { logger } from './logger.js';
import { hasSupabaseConfig } from './supabaseClient.js';
import { sendCartAbandonmentEmail } from './email.js';
import { getOrdersByUserId } from './checkoutState.js';
import { loadSavedCartsSnapshot, persistSavedCartsSnapshot } from './cartAbandonmentStore.js';
import type { SavedCart } from './cartAbandonmentStore.js';

export type { SavedCart } from './cartAbandonmentStore.js';

const CARTS_PATH = path.resolve(process.cwd(), 'server', '.data', 'saved-carts.json');
const ABANDONMENT_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const savedCarts = new Map<string, SavedCart>();
let persistQueue: Promise<void> = Promise.resolve();

function isSavedCart(value: unknown): value is SavedCart {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.userId === 'string' &&
    typeof obj.email === 'string' &&
    Array.isArray(obj.items) &&
    typeof obj.savedAt === 'string' &&
    typeof obj.emailSent === 'boolean'
  );
}

function hydrateFromParsed(carts: SavedCart[]): void {
  for (const cart of carts) {
    if (!isSavedCart(cart)) continue;
    savedCarts.set(cart.userId, cart);
  }
}

function hydrateSync(): void {
  const data = readJsonFile<SavedCart[]>(CARTS_PATH, []);
  hydrateFromParsed(data);
}

async function hydrateAsync(): Promise<void> {
  try {
    const data = await loadSavedCartsSnapshot(CARTS_PATH);
    hydrateFromParsed(data);
  } catch (error) {
    logger.error('Failed to hydrate saved carts from Supabase, falling back to local.', {
      error: error instanceof Error ? error.message : String(error),
    });
    hydrateSync();
  }
}

function persist(): void {
  const snapshot = [...savedCarts.values()];
  persistQueue = persistQueue
    .then(() => persistSavedCartsSnapshot(CARTS_PATH, snapshot))
    .catch((error) => {
      logger.error('Failed to persist saved carts', { error: error instanceof Error ? error.message : String(error) });
    });
}

export function saveUserCart(userId: string, email: string, items: { name: string; price: number; quantity: number }[]): void {
  if (items.length === 0) {
    savedCarts.delete(userId);
  } else {
    savedCarts.set(userId, {
      userId,
      email,
      items,
      savedAt: new Date().toISOString(),
      emailSent: false,
    });
  }
  persist();
}

export function restoreUserCart(userId: string): { name: string; price: number; quantity: number }[] | null {
  const cart = savedCarts.get(userId);
  return cart ? cart.items : null;
}

async function checkAbandonedCarts(): Promise<void> {
  const now = Date.now();

  for (const [userId, cart] of savedCarts.entries()) {
    if (cart.emailSent) continue;
    if (cart.items.length === 0) continue;

    const savedTime = new Date(cart.savedAt).getTime();
    if (now - savedTime < ABANDONMENT_THRESHOLD_MS) continue;

    // Check if user has completed an order since saving the cart
    const userOrders = getOrdersByUserId(userId);
    const hasCompletedOrder = userOrders.some(o => o.status === 'COMPLETED' && new Date(o.updatedAt).getTime() >= savedTime);
    if (hasCompletedOrder) continue;

    const emailItems = cart.items.map(item => ({ name: item.name, price: item.price }));
    void sendCartAbandonmentEmail(cart.email, emailItems).then((sent) => {
      if (sent) {
        const updated: SavedCart = { ...cart, emailSent: true };
        savedCarts.set(userId, updated);
        persist();
        logger.info('Cart abandonment email sent', { userId });
      }
    }).catch((error) => {
      logger.error('Cart abandonment email send failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

let checkerInterval: ReturnType<typeof setInterval> | null = null;

export function startCartAbandonmentChecker(): void {
  if (checkerInterval) return;
  checkerInterval = setInterval(() => {
    checkAbandonedCarts().catch((error) => {
      logger.error('Cart abandonment checker error', { error: error instanceof Error ? error.message : String(error) });
    });
  }, CHECK_INTERVAL_MS);
  checkerInterval.unref();
  logger.info('Cart abandonment checker started');
}

const CART_HYDRATION_TIMEOUT_MS = 15_000;

export const cartAbandonmentHydrationReady: Promise<void> = hasSupabaseConfig()
  ? Promise.race([
      hydrateAsync(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Cart abandonment hydration timed out')), CART_HYDRATION_TIMEOUT_MS),
      ),
    ]).catch((error) => {
      logger.error('Cart abandonment async hydration failed or timed out.', {
        error: error instanceof Error ? error.message : String(error),
      });
    })
  : Promise.resolve(hydrateSync());
