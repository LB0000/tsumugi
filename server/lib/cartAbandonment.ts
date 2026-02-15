import path from 'path';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import { logger } from './logger.js';
import { sendCartAbandonmentEmail } from './email.js';
import { getOrdersByUserId } from './checkoutState.js';

interface SavedCart {
  userId: string;
  email: string;
  items: { name: string; price: number; quantity: number }[];
  savedAt: string;
  emailSent: boolean;
}

const CARTS_PATH = path.resolve(process.cwd(), 'server', '.data', 'saved-carts.json');
const ABANDONMENT_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const savedCarts = new Map<string, SavedCart>();
let persistQueue: Promise<void> = Promise.resolve();

function hydrate(): void {
  const data = readJsonFile<SavedCart[]>(CARTS_PATH, []);
  for (const cart of data) {
    if (typeof cart.userId === 'string' && typeof cart.email === 'string' && Array.isArray(cart.items)) {
      savedCarts.set(cart.userId, cart);
    }
  }
}

function persist(): void {
  const snapshot = [...savedCarts.values()];
  persistQueue = persistQueue
    .then(() => writeJsonAtomic(CARTS_PATH, snapshot))
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
        cart.emailSent = true;
        persist();
        logger.info('Cart abandonment email sent', { userId });
      }
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

hydrate();
