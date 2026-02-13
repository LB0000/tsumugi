import { SquareClient, SquareEnvironment } from 'square';

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
}

export async function fetchAnalytics(startDate: string, endDate: string): Promise<AnalyticsResult> {
  const client = getClient();
  if (!client) {
    return { data: generateMockData(startDate, endDate), source: 'mock' };
  }

  try {
    const locationId = process.env.SQUARE_LOCATION_ID || '';
    const response = await client.orders.search({
      locationIds: [locationId],
      query: {
        filter: {
          dateTimeFilter: {
            createdAt: {
              startAt: `${startDate}T00:00:00Z`,
              endAt: `${endDate}T23:59:59Z`,
            },
          },
          stateFilter: { states: ['COMPLETED'] },
        },
        sort: { sortField: 'CREATED_AT', sortOrder: 'ASC' },
      },
    });

    const orders = response.orders || [];
    const dailyMap = new Map<string, DailyAnalytics>();

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

      for (const item of order.lineItems || []) {
        const name = item.name || 'Unknown';
        existing.productBreakdown[name] = (existing.productBreakdown[name] || 0) + Number(item.quantity || 1);
      }

      dailyMap.set(date, existing);
    }

    const results: DailyAnalytics[] = [];
    for (const analytics of dailyMap.values()) {
      analytics.avgOrderValue = analytics.totalOrders > 0
        ? Math.round(analytics.totalRevenue / analytics.totalOrders)
        : 0;
      results.push(analytics);
    }

    return { data: results, source: 'live' };
  } catch (error) {
    console.error('Square API error, falling back to mock data:', error);
    return { data: generateMockData(startDate, endDate), source: 'mock' };
  }
}

function generateMockData(startDate: string, endDate: string): DailyAnalytics[] {
  const results: DailyAnalytics[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const products = ['高解像度画像データ', 'アクリルスタンド', 'キャンバスアート', 'オリジナルスマホケース', '特製ポストカード'];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    const orders = Math.floor(Math.random() * 8) + 1;
    const revenue = orders * (2500 + Math.floor(Math.random() * 2500));
    const breakdown: Record<string, number> = {};
    for (let i = 0; i < orders; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      breakdown[product] = (breakdown[product] || 0) + 1;
    }

    results.push({
      date,
      totalOrders: orders,
      totalRevenue: revenue,
      uniqueCustomers: Math.max(1, orders - Math.floor(Math.random() * 2)),
      avgOrderValue: Math.round(revenue / orders),
      productBreakdown: breakdown,
    });
  }

  return results;
}
