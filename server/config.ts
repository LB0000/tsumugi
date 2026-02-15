import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().optional(),
  GEMINI_API_KEY: z.string().default(''),
  SQUARE_ACCESS_TOKEN: z.string().min(1).optional(),
  SQUARE_ENVIRONMENT: z.enum(['production', 'sandbox']).default('sandbox'),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SESSION_SECRET: z.string().min(1).optional(),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
