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
  RESEND_API_KEY: isProduction ? z.string().min(1) : z.string().optional(),
  FROM_EMAIL: z.string().optional(),
  SESSION_SECRET: isProduction ? z.string().min(16) : z.string().min(1).optional(),
  INTERNAL_API_KEY: z.string().optional(),
  TSUMUGI_ADMIN_API_URL: z.string().url().optional(),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
