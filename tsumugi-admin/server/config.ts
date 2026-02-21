import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: isProduction ? z.string().url() : z.string().url().optional(),
  ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD is required (min 12 chars). Set it in tsumugi-admin/.env'),
  DATABASE_URL: z.string().default('./data/tsumugi-admin.db'),
  GEMINI_API_KEY: z.string().optional(),
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_LOCATION_ID: z.string().optional(),
  SQUARE_ENVIRONMENT: z.enum(['production', 'sandbox']).default('sandbox'),
  TSUMUGI_API_URL: z.string().url().default('http://localhost:3001'),
  INTERNAL_API_KEY: isProduction ? z.string().min(16) : z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().default('noreply@example.com'),
  MARKETING_UNSUBSCRIBE_SECRET: z.string().min(16).optional(),
  MARKETING_UNSUBSCRIBE_BASE_URL: z.string().url().optional(),
  TSUMUGI_ADMIN_API_URL: z.string().url().optional(),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
