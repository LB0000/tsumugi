export interface DailyAnalytics {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  productBreakdown: Record<string, number>;
}

export interface AnalyticsSummary {
  period: { startDate: string; endDate: string };
  source: 'live' | 'mock';
  totals: {
    totalOrders: number;
    totalRevenue: number;
    uniqueCustomers: number;
    avgOrderValue: number;
  };
  daily: DailyAnalytics[];
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
}

export type ContentType = 'sns_post' | 'ad_copy' | 'blog_article';
export type ContentPlatform = 'instagram' | 'twitter' | 'tiktok' | 'blog';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface Customer {
  id: string;
  tsumugiUserId: string;
  email: string;
  name: string;
  authProvider: 'email' | 'google';
  registeredAt: string | null;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  totalOrders: number;
  totalSpent: number;
  segment: 'new' | 'active' | 'lapsed';
  marketingOptOutAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerStats {
  totalCustomers: number;
  customersWithPurchases: number;
  repeatCustomers: number;
  repeatRate: number;
  avgLTV: number;
  totalRevenue: number;
  segments: { new: number; active: number; lapsed: number };
}

export interface Content {
  id: string;
  type: ContentType;
  platform: ContentPlatform | null;
  title: string;
  body: string;
  status: ContentStatus;
  aiPrompt: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export type CampaignType = 'email' | 'coupon' | 'sns' | 'ab_test';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description: string | null;
  config: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  campaignId: string | null;
  expiresAt: string | null;
  createdAt: string;
  isActive: boolean;
}
