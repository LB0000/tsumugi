import { db } from '../db/index.js';
import { customers } from '../db/schema.js';
import { nanoid } from 'nanoid';
import { eq, sql } from 'drizzle-orm';

interface RemoteCustomer {
  tsumugiUserId: string;
  email: string;
  name: string;
  authProvider: 'email' | 'google';
  registeredAt: string | null;
  totalOrders: number;
  totalSpent: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
}

interface RemoteCustomersResponse {
  customers: RemoteCustomer[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
}

function classifySegment(totalOrders: number, lastPurchaseAt: string | null): string {
  if (totalOrders === 0) return 'new';
  if (!lastPurchaseAt) return 'new';

  const daysSinceLastPurchase = Math.floor(
    (Date.now() - new Date(lastPurchaseAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastPurchase <= 90) return 'active';
  return 'lapsed';
}

export async function syncCustomers(): Promise<{ synced: number; created: number; updated: number }> {
  const tsumugiApiUrl = process.env.TSUMUGI_API_URL || 'http://localhost:3001';
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!internalKey) {
    throw new Error('INTERNAL_API_KEY is not configured');
  }

  const PAGE_SIZE = 500;
  const REQUEST_TIMEOUT_MS = 15_000;
  const MAX_PAGES = 1_000;
  let offset = 0;
  let fetchedCount = 0;
  let fetchedPageCount = 0;

  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();
  const existingByUserId = new Map<string, {
    email: string;
    name: string;
    authProvider: 'email' | 'google';
    registeredAt: string | null;
    firstPurchaseAt: string | null;
    lastPurchaseAt: string | null;
    totalOrders: number;
    totalSpent: number;
    segment: string;
  }>();

  const existingRows = db
    .select({
      tsumugiUserId: customers.tsumugiUserId,
      email: customers.email,
      name: customers.name,
      authProvider: customers.authProvider,
      registeredAt: customers.registeredAt,
      firstPurchaseAt: customers.firstPurchaseAt,
      lastPurchaseAt: customers.lastPurchaseAt,
      totalOrders: customers.totalOrders,
      totalSpent: customers.totalSpent,
      segment: customers.segment,
    })
    .from(customers)
    .all();
  for (const row of existingRows) {
    existingByUserId.set(row.tsumugiUserId, {
      email: row.email,
      name: row.name,
      authProvider: row.authProvider as 'email' | 'google',
      registeredAt: row.registeredAt,
      firstPurchaseAt: row.firstPurchaseAt,
      lastPurchaseAt: row.lastPurchaseAt,
      totalOrders: row.totalOrders ?? 0,
      totalSpent: row.totalSpent ?? 0,
      segment: row.segment,
    });
  }

  while (true) {
    fetchedPageCount += 1;
    if (fetchedPageCount > MAX_PAGES) {
      throw new Error(`Customer sync exceeded maximum page count (${MAX_PAGES})`);
    }

    const url = new URL('/api/internal/customers', tsumugiApiUrl);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: globalThis.Response;
    try {
      response = await fetch(url.toString(), {
        headers: { 'X-Internal-Key': internalKey },
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Fetching customers timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch customers: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as RemoteCustomersResponse;
    const batch = Array.isArray(payload.customers) ? payload.customers : [];
    fetchedCount += batch.length;

    // Use a transaction for atomic upsert per page
    db.transaction((tx) => {
      for (const remote of batch) {
        const normalizedEmail = remote.email.trim().toLowerCase();
        const normalizedName = remote.name.trim();
        const segment = classifySegment(remote.totalOrders, remote.lastPurchaseAt);
        const existing = existingByUserId.get(remote.tsumugiUserId);

        if (!existing) {
          tx.insert(customers).values({
            id: nanoid(),
            tsumugiUserId: remote.tsumugiUserId,
            email: normalizedEmail,
            name: normalizedName,
            authProvider: remote.authProvider,
            registeredAt: remote.registeredAt,
            firstPurchaseAt: remote.firstPurchaseAt,
            lastPurchaseAt: remote.lastPurchaseAt,
            totalOrders: remote.totalOrders,
            totalSpent: remote.totalSpent,
            segment,
            createdAt: now,
            updatedAt: now,
          }).run();
          created++;
          existingByUserId.set(remote.tsumugiUserId, {
            email: normalizedEmail,
            name: normalizedName,
            authProvider: remote.authProvider,
            registeredAt: remote.registeredAt,
            firstPurchaseAt: remote.firstPurchaseAt,
            lastPurchaseAt: remote.lastPurchaseAt,
            totalOrders: remote.totalOrders,
            totalSpent: remote.totalSpent,
            segment,
          });
          continue;
        }

        const hasChanges =
          existing.email !== normalizedEmail ||
          existing.name !== normalizedName ||
          existing.authProvider !== remote.authProvider ||
          existing.registeredAt !== remote.registeredAt ||
          existing.firstPurchaseAt !== remote.firstPurchaseAt ||
          existing.lastPurchaseAt !== remote.lastPurchaseAt ||
          existing.totalOrders !== remote.totalOrders ||
          existing.totalSpent !== remote.totalSpent ||
          existing.segment !== segment;

        if (!hasChanges) continue;

        tx.update(customers)
          .set({
            email: normalizedEmail,
            name: normalizedName,
            authProvider: remote.authProvider,
            registeredAt: remote.registeredAt,
            firstPurchaseAt: remote.firstPurchaseAt,
            lastPurchaseAt: remote.lastPurchaseAt,
            totalOrders: remote.totalOrders,
            totalSpent: remote.totalSpent,
            segment,
            updatedAt: now,
          })
          .where(eq(customers.tsumugiUserId, remote.tsumugiUserId))
          .run();
        updated++;
        existingByUserId.set(remote.tsumugiUserId, {
          email: normalizedEmail,
          name: normalizedName,
          authProvider: remote.authProvider,
          registeredAt: remote.registeredAt,
          firstPurchaseAt: remote.firstPurchaseAt,
          lastPurchaseAt: remote.lastPurchaseAt,
          totalOrders: remote.totalOrders,
          totalSpent: remote.totalSpent,
          segment,
        });
      }
    });

    const nextOffset = payload.pagination?.nextOffset;
    if (typeof nextOffset === 'number') {
      if (!Number.isInteger(nextOffset) || nextOffset < 0) {
        throw new Error('Invalid pagination offset returned by internal customer API');
      }
      if (nextOffset <= offset && batch.length > 0) {
        throw new Error(`Customer pagination did not advance (offset ${offset} -> ${nextOffset})`);
      }
      if (nextOffset <= offset && batch.length === 0) {
        break;
      }
      offset = nextOffset;
      continue;
    }

    if (batch.length < PAGE_SIZE) {
      break;
    }
    offset += batch.length;
  }

  return { synced: fetchedCount, created, updated };
}

export function getCustomerStats() {
  const row = db.get<{
    totalCustomers: number;
    customersWithPurchases: number;
    repeatCustomers: number;
    totalRevenue: number;
    segNew: number;
    segActive: number;
    segLapsed: number;
  }>(sql`
    SELECT
      COUNT(*) as totalCustomers,
      SUM(CASE WHEN total_orders > 0 THEN 1 ELSE 0 END) as customersWithPurchases,
      SUM(CASE WHEN total_orders > 1 THEN 1 ELSE 0 END) as repeatCustomers,
      COALESCE(SUM(total_spent), 0) as totalRevenue,
      SUM(CASE WHEN segment = 'new' THEN 1 ELSE 0 END) as segNew,
      SUM(CASE WHEN segment = 'active' THEN 1 ELSE 0 END) as segActive,
      SUM(CASE WHEN segment = 'lapsed' THEN 1 ELSE 0 END) as segLapsed
    FROM customers
  `);

  if (!row || row.totalCustomers === 0) {
    return {
      totalCustomers: 0,
      customersWithPurchases: 0,
      repeatCustomers: 0,
      repeatRate: 0,
      avgLTV: 0,
      totalRevenue: 0,
      segments: { new: 0, active: 0, lapsed: 0 },
    };
  }

  return {
    totalCustomers: row.totalCustomers,
    customersWithPurchases: row.customersWithPurchases,
    repeatCustomers: row.repeatCustomers,
    repeatRate: row.customersWithPurchases > 0
      ? Math.round((row.repeatCustomers / row.customersWithPurchases) * 100)
      : 0,
    avgLTV: Math.round(row.totalRevenue / row.totalCustomers),
    totalRevenue: row.totalRevenue,
    segments: {
      new: row.segNew,
      active: row.segActive,
      lapsed: row.segLapsed,
    },
  };
}
