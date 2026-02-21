import { OrderState, SquareClient, SquareEnvironment } from 'square';
import { recordApiCall } from './api-monitor.js';

const environment = process.env.SQUARE_ENVIRONMENT === 'production'
  ? SquareEnvironment.Production
  : SquareEnvironment.Sandbox;

let squareClient: SquareClient | null = null;

function getClient(): SquareClient | null {
  if (!process.env.SQUARE_ACCESS_TOKEN) return null;
  if (!squareClient) {
    squareClient = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN,
      environment,
    });
  }
  return squareClient;
}

export interface DailyAnalytics {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  productBreakdown: Record<string, number>;
}

export interface AnalyticsResult {
  data: DailyAnalytics[];
  source: 'live' | 'mock';
  periodUniqueCustomers: number;
}

function deriveCustomerKey(order: {
  customerId?: string | null;
  fulfillments?: unknown;
}): string | null {
  if (typeof order.customerId === 'string' && order.customerId.trim().length > 0) {
    return `sq:${order.customerId.trim()}`;
  }

  if (!Array.isArray(order.fulfillments)) return null;
  for (const fulfillment of order.fulfillments) {
    if (!fulfillment || typeof fulfillment !== 'object') continue;
    const shipmentDetails = (fulfillment as Record<string, unknown>).shipmentDetails;
    if (!shipmentDetails || typeof shipmentDetails !== 'object') continue;
    const recipient = (shipmentDetails as Record<string, unknown>).recipient;
    if (!recipient || typeof recipient !== 'object') continue;

    const emailAddress = (recipient as Record<string, unknown>).emailAddress;
    if (typeof emailAddress === 'string' && emailAddress.trim().length > 0) {
      return `mail:${emailAddress.trim().toLowerCase()}`;
    }

    const phoneNumber = (recipient as Record<string, unknown>).phoneNumber;
    if (typeof phoneNumber === 'string' && phoneNumber.trim().length > 0) {
      return `tel:${phoneNumber.trim()}`;
    }
  }

  return null;
}

export async function fetchAnalytics(startDate: string, endDate: string): Promise<AnalyticsResult> {
  const client = getClient();
  if (!client) {
    const { data, periodUniqueCustomers } = generateMockAnalytics(startDate, endDate);
    return {
      data,
      source: 'mock',
      periodUniqueCustomers,
    };
  }

  const start = Date.now();
  try {
    const locationId = process.env.SQUARE_LOCATION_ID || '';
    const orderQuery = {
      filter: {
        dateTimeFilter: {
          createdAt: {
            startAt: `${startDate}T00:00:00Z`,
            endAt: `${endDate}T23:59:59Z`,
          },
        },
        stateFilter: { states: [OrderState.Completed] },
      },
      sort: { sortField: 'CREATED_AT' as const, sortOrder: 'ASC' as const },
    };
    const orders: Array<{
      createdAt?: string | null;
      totalMoney?: { amount?: bigint | number | string | null } | null;
      lineItems?: Array<{ name?: string | null; quantity?: string | number | null }> | null;
      customerId?: string | null;
      fulfillments?: unknown;
    }> = [];

    let cursor: string | undefined;
    do {
      const response = await client.orders.search({
        locationIds: [locationId],
        query: orderQuery,
        ...(cursor ? { cursor } : {}),
      });
      if (Array.isArray(response.orders) && response.orders.length > 0) {
        orders.push(...response.orders);
      }
      cursor = typeof response.cursor === 'string' && response.cursor.length > 0 ? response.cursor : undefined;
    } while (cursor);

    const dailyMap = new Map<string, DailyAnalytics>();
    const dailyCustomerKeys = new Map<string, Set<string>>();
    const periodCustomerKeys = new Set<string>();

    for (const order of orders) {
      const date = order.createdAt?.slice(0, 10) || '';
      if (!date) continue;

      const existing = dailyMap.get(date) || {
        date,
        totalOrders: 0,
        totalRevenue: 0,
        uniqueCustomers: 0,
        avgOrderValue: 0,
        productBreakdown: {},
      };

      existing.totalOrders += 1;
      const amount = Number(order.totalMoney?.amount || 0);
      existing.totalRevenue += amount;
      const customerKey = deriveCustomerKey(order);
      if (customerKey) {
        periodCustomerKeys.add(customerKey);
        const daySet = dailyCustomerKeys.get(date) ?? new Set<string>();
        daySet.add(customerKey);
        dailyCustomerKeys.set(date, daySet);
      }

      for (const item of order.lineItems || []) {
        const name = item.name || 'Unknown';
        existing.productBreakdown[name] = (existing.productBreakdown[name] || 0) + Number(item.quantity || 1);
      }

      dailyMap.set(date, existing);
    }

    const results: DailyAnalytics[] = [];
    for (const analytics of dailyMap.values()) {
      analytics.uniqueCustomers = dailyCustomerKeys.get(analytics.date)?.size ?? 0;
      analytics.avgOrderValue = analytics.totalOrders > 0
        ? Math.round(analytics.totalRevenue / analytics.totalOrders)
        : 0;
      results.push(analytics);
    }

    recordApiCall('square', 'fetchAnalytics', 'success', Date.now() - start);
    return {
      data: results.sort((a, b) => a.date.localeCompare(b.date)),
      source: 'live',
      periodUniqueCustomers: periodCustomerKeys.size,
    };
  } catch (error) {
    recordApiCall('square', 'fetchAnalytics', 'error', Date.now() - start, error instanceof Error ? error.message : undefined);
    console.error('Square API error, falling back to mock data:', error);
    const { data, periodUniqueCustomers } = generateMockAnalytics(startDate, endDate);
    return {
      data,
      source: 'mock',
      periodUniqueCustomers,
    };
  }
}

function generateMockAnalytics(startDate: string, endDate: string): {
  data: DailyAnalytics[];
  periodUniqueCustomers: number;
} {
  const results: DailyAnalytics[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const products = ['高解像度画像データ', 'アクリルスタンド', 'キャンバスアート', 'オリジナルスマホケース', '特製ポストカード'];
  const customerPool = Array.from({ length: 120 }, (_, index) => `mock-customer-${index + 1}`);
  const periodCustomerSet = new Set<string>();

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    const orders = Math.floor(Math.random() * 8) + 1;
    const revenue = orders * (2500 + Math.floor(Math.random() * 2500));
    const dailyCustomerSet = new Set<string>();
    const breakdown: Record<string, number> = {};
    for (let i = 0; i < orders; i++) {
      const customerId = customerPool[Math.floor(Math.random() * customerPool.length)];
      dailyCustomerSet.add(customerId);
      periodCustomerSet.add(customerId);
      const product = products[Math.floor(Math.random() * products.length)];
      breakdown[product] = (breakdown[product] || 0) + 1;
    }

    results.push({
      date,
      totalOrders: orders,
      totalRevenue: revenue,
      uniqueCustomers: dailyCustomerSet.size,
      avgOrderValue: Math.round(revenue / orders),
      productBreakdown: breakdown,
    });
  }

  return {
    data: results,
    periodUniqueCustomers: periodCustomerSet.size,
  };
}
