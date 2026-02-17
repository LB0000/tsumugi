import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: isProduction ? z.string().url() : z.string().url().optional(),
  GEMINI_API_KEY: z.string().default(''),
  SQUARE_ACCESS_TOKEN: z.string().min(1).optional(),
  SQUARE_LOCATION_ID: z.string().min(1).optional(),
  SQUARE_ENVIRONMENT: z.enum(['production', 'sandbox']).default('sandbox'),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),
  SQUARE_WEBHOOK_NOTIFICATION_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  INTERNAL_API_KEY: z.string().optional(),
  TSUMUGI_ADMIN_API_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional().refine(
    (val) => !val || val.startsWith('https://'),
    { message: 'SUPABASE_URL must use HTTPS' },
  ),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SUPABASE_AUTH_USERS_TABLE: z.string().min(1).default('auth_users'),
  SUPABASE_AUTH_SESSIONS_TABLE: z.string().min(1).default('auth_sessions'),
  SUPABASE_AUTH_RESET_TOKENS_TABLE: z.string().min(1).default('auth_reset_tokens'),
  SUPABASE_AUTH_VERIFICATION_TOKENS_TABLE: z.string().min(1).default('auth_verification_tokens'),
  SUPABASE_AUTH_ADDRESSES_TABLE: z.string().min(1).default('auth_saved_addresses'),
  SUPABASE_AUTH_STATE_TABLE: z.string().min(1).default('app_state'),
  SUPABASE_AUTH_STATE_KEY: z.string().min(1).default('auth-store'),
  SUPABASE_CHECKOUT_ORDERS_TABLE: z.string().min(1).default('checkout_orders'),
  SUPABASE_CHECKOUT_EVENTS_TABLE: z.string().min(1).default('checkout_webhook_events'),
  SUPABASE_STYLE_ANALYTICS_TABLE: z.string().min(1).default('style_analytics'),
  SUPABASE_GALLERY_TABLE: z.string().min(1).default('gallery_items'),
  SUPABASE_SAVED_CARTS_TABLE: z.string().min(1).default('saved_carts'),
  SUPABASE_SCHEDULED_EMAILS_TABLE: z.string().min(1).default('scheduled_emails'),
  LYLY_API_URL: z.string().url().optional(),
  LYLY_AUTH_TOKEN: z.string().min(10).optional(),  // [H5] Minimum length validation
}).superRefine((data, ctx) => {
  const hasUrl = Boolean(data.SUPABASE_URL);
  const hasKey = Boolean(data.SUPABASE_SERVICE_ROLE_KEY);
  if (hasUrl !== hasKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set or both be omitted',
    });
  }
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
