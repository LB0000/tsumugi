import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const contents = sqliteTable('contents', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'sns_post' | 'ad_copy' | 'blog_article'
  platform: text('platform'),   // 'instagram' | 'twitter' | 'tiktok' | 'blog'
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull(), // 'draft' | 'published' | 'archived'
  aiPrompt: text('ai_prompt'),
  tags: text('tags'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  publishedAt: text('published_at'),
});

export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'email' | 'coupon' | 'sns' | 'ab_test'
  status: text('status').notNull(), // 'draft' | 'scheduled' | 'active' | 'completed'
  description: text('description'),
  config: text('config'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const coupons = sqliteTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type').notNull(), // 'percentage' | 'fixed'
  discountValue: real('discount_value').notNull(),
  maxUses: integer('max_uses'),
  currentUses: integer('current_uses').default(0),
  campaignId: text('campaign_id').references(() => campaigns.id),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const analyticsSnapshots = sqliteTable('analytics_snapshots', {
  id: text('id').primaryKey(),
  date: text('date').notNull().unique(),
  totalOrders: integer('total_orders').default(0),
  totalRevenue: integer('total_revenue').default(0),
  uniqueCustomers: integer('unique_customers').default(0),
  avgOrderValue: real('avg_order_value').default(0),
  productBreakdown: text('product_breakdown'),
  createdAt: text('created_at').notNull(),
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  tsumugiUserId: text('tsumugi_user_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  authProvider: text('auth_provider').notNull(), // 'email' | 'google'
  registeredAt: text('registered_at'),
  firstPurchaseAt: text('first_purchase_at'),
  lastPurchaseAt: text('last_purchase_at'),
  totalOrders: integer('total_orders').default(0),
  totalSpent: integer('total_spent').default(0),
  segment: text('segment').notNull(), // 'new' | 'active' | 'lapsed'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const emailSends = sqliteTable('email_sends', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').references(() => campaigns.id),
  recipientEmail: text('recipient_email').notNull(),
  subject: text('subject').notNull(),
  status: text('status').notNull(), // 'sent' | 'failed' | 'bounced'
  sentAt: text('sent_at'),
  openedAt: text('opened_at'),
});
