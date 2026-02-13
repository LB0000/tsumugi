import { db } from '../db/index.js';
import { customers } from '../db/schema.js';
import { nanoid } from 'nanoid';
import { sql } from 'drizzle-orm';

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
  const remoteCustomers: RemoteCustomer[] = [];
  let offset = 0;

  while (true) {
    const url = new URL('/api/internal/customers', tsumugiApiUrl);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));

    const response = await fetch(url.toString(), {
      headers: { 'X-Internal-Key': internalKey },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch customers: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as RemoteCustomersResponse;
    const batch = Array.isArray(payload.customers) ? payload.customers : [];
    remoteCustomers.push(...batch);

    const nextOffset = payload.pagination?.nextOffset;
    if (typeof nextOffset === 'number') {
      offset = nextOffset;
      continue;
    }

    if (batch.length < PAGE_SIZE) {
      break;
    }
    offset += batch.length;
  }

  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();
  const existingUserIdSet = new Set<string>();

  const existingRows = db
    .select({ tsumugiUserId: customers.tsumugiUserId })
    .from(customers)
    .all();
  for (const row of existingRows) {
    existingUserIdSet.add(row.tsumugiUserId);
  }

  // Use a transaction for atomic batch upsert
  db.transaction((tx) => {
    for (const remote of remoteCustomers) {
      const segment = classifySegment(remote.totalOrders, remote.lastPurchaseAt);
      const id = nanoid();
      const existedBefore = existingUserIdSet.has(remote.tsumugiUserId);

      tx.run(sql`
        INSERT INTO customers (id, tsumugi_user_id, email, name, auth_provider, registered_at,
          first_purchase_at, last_purchase_at, total_orders, total_spent, segment, created_at, updated_at)
        VALUES (${id}, ${remote.tsumugiUserId}, ${remote.email}, ${remote.name}, ${remote.authProvider},
          ${remote.registeredAt}, ${remote.firstPurchaseAt}, ${remote.lastPurchaseAt},
          ${remote.totalOrders}, ${remote.totalSpent}, ${segment}, ${now}, ${now})
        ON CONFLICT(tsumugi_user_id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          auth_provider = excluded.auth_provider,
          total_orders = excluded.total_orders,
          total_spent = excluded.total_spent,
          first_purchase_at = excluded.first_purchase_at,
          last_purchase_at = excluded.last_purchase_at,
          segment = excluded.segment,
          updated_at = excluded.updated_at
      `);

      if (existedBefore) {
        updated++;
      } else {
        created++;
        existingUserIdSet.add(remote.tsumugiUserId);
      }
    }
  });

  return { synced: remoteCustomers.length, created, updated };
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
