export interface StrategicGoal {
  id: string;
  name: string;
  category: 'reviews' | 'email_list' | 'seo' | 'sns' | 'revenue' | 'customers' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdSpend {
  id: string;
  channel: 'meta' | 'google' | 'tiktok' | 'influencer' | 'other';
  amount: number;
  period: string; // YYYY-MM
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  note: string | null;
  createdAt: string;
}

export interface CacSummary {
  totalSpend: number;
  totalConversions: number;
  avgCac: number;
  totalRevenue: number;
  roas: number;
}

export interface FunnelSnapshot {
  id: string;
  date: string;
  visitors: number;
  freeGenerations: number;
  charges: number;
  physicalPurchases: number;
  revenue: number;
  createdAt: string;
}

export interface FunnelConversionRates {
  visitToFree: number;
  freeToCharge: number;
  chargeToPurchase: number;
  visitToPurchase: number;
}

export type GoalCategory = StrategicGoal['category'];
export type AdChannel = AdSpend['channel'];

export const CATEGORY_LABELS: Record<GoalCategory, string> = {
  reviews: 'レビュー',
  email_list: 'メールリスト',
  seo: 'SEO',
  sns: 'SNS',
  revenue: '売上',
  customers: '顧客',
  custom: 'その他',
};

export const CHANNEL_LABELS: Record<AdChannel, string> = {
  meta: 'Meta広告',
  google: 'Google広告',
  tiktok: 'TikTok広告',
  influencer: 'インフルエンサー',
  other: 'その他',
};

export const CHANNEL_BADGE_COLORS: Record<AdChannel, string> = {
  meta: 'bg-blue-100 text-blue-700',
  google: 'bg-green-100 text-green-700',
  tiktok: 'bg-pink-100 text-pink-700',
  influencer: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

export const CATEGORY_BADGE_COLORS: Record<GoalCategory, string> = {
  reviews: 'bg-amber-100 text-amber-700',
  email_list: 'bg-blue-100 text-blue-700',
  seo: 'bg-green-100 text-green-700',
  sns: 'bg-pink-100 text-pink-700',
  revenue: 'bg-emerald-100 text-emerald-700',
  customers: 'bg-purple-100 text-purple-700',
  custom: 'bg-gray-100 text-gray-700',
};
