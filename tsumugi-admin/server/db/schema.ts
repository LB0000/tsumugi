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
  marketingOptOutAt: text('marketing_opt_out_at'),
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

export const strategicGoals = sqliteTable('strategic_goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'reviews' | 'email_list' | 'seo' | 'sns' | 'revenue' | 'customers' | 'custom'
  targetValue: real('target_value').notNull(),
  currentValue: real('current_value').notNull().default(0),
  unit: text('unit').notNull(),
  deadline: text('deadline').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const adSpends = sqliteTable('ad_spends', {
  id: text('id').primaryKey(),
  channel: text('channel').notNull(), // 'meta' | 'google' | 'tiktok' | 'influencer' | 'other'
  amount: integer('amount').notNull(),
  period: text('period').notNull(), // YYYY-MM
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  conversions: integer('conversions').default(0),
  revenue: integer('revenue').default(0),
  note: text('note'),
  createdAt: text('created_at').notNull(),
});

export const funnelSnapshots = sqliteTable('funnel_snapshots', {
  id: text('id').primaryKey(),
  date: text('date').notNull().unique(),
  visitors: integer('visitors').default(0),
  freeGenerations: integer('free_generations').default(0),
  charges: integer('charges').default(0),
  physicalPurchases: integer('physical_purchases').default(0),
  revenue: integer('revenue').default(0),
  createdAt: text('created_at').notNull(),
});

export const systemStatus = sqliteTable('system_status', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'backup_failure' | 'sync_failure' | 'api_error' | 'anomaly'
  severity: text('severity').notNull(), // 'info' | 'warning' | 'critical'
  title: text('title').notNull(),
  message: text('message').notNull(),
  metadata: text('metadata'), // JSON
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  readAt: text('read_at'),
});

export const apiUsageLogs = sqliteTable('api_usage_logs', {
  id: text('id').primaryKey(),
  service: text('service').notNull(), // 'gemini' | 'square' | 'resend' | 'tsumugi'
  endpoint: text('endpoint'),
  status: text('status').notNull(), // 'success' | 'error' | 'timeout'
  responseTimeMs: integer('response_time_ms'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
});

export const actionPlans = sqliteTable('action_plans', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => strategicGoals.id),
  title: text('title').notNull(),
  description: text('description'),
  actionType: text('action_type').notNull(), // 'email' | 'coupon' | 'content' | 'sync' | 'manual'
  status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'completed' | 'failed'
  priority: text('priority').notNull().default('medium'), // 'high' | 'medium' | 'low'
  dueDate: text('due_date'),
  config: text('config'), // JSON: action-specific configuration
  executedAt: text('executed_at'),
  executionResult: text('execution_result'), // JSON: execution result details
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  completedAt: text('completed_at'),
});
