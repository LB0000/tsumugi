import { z } from 'zod';

// Common schemas
export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8);
export const nameSchema = z.string().min(1).max(100);

// Auth schemas
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1) });
export const registerSchema = z.object({ email: emailSchema, password: passwordSchema, name: nameSchema });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string().min(1), password: passwordSchema });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema });
export const profileUpdateSchema = z.object({ name: nameSchema });
export const googleLoginSchema = z.object({ credential: z.string().min(1) });

// Checkout schemas
export const cartItemSchema = z.object({
  styleId: z.string().min(1),
  styleName: z.string().min(1),
  printSize: z.string().optional(),
  quantity: z.number().int().min(1).max(10),
  price: z.number().min(0),
  imageUrl: z.string().min(1),
  galleryId: z.string().optional(),
});
export const shippingAddressSchema = z.object({
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/, '電話番号の形式が正しくありません'),
  postalCode: z.string().regex(/^\d{3}-?\d{4}$/, '郵便番号の形式が正しくありません'),
  prefecture: z.string().min(1),
  city: z.string().min(1),
  addressLine: z.string().min(1),
});
export const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  shippingAddress: shippingAddressSchema,
  couponCode: z.string().optional(),
});
export const processPaymentSchema = z.object({
  orderId: z.string().min(1),
  sourceId: z.string().min(1),
  idempotencyKey: z.string().min(1),
});

// Contact & Support
export const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
});
export const supportChatSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
});

// Address
export const savedAddressSchema = shippingAddressSchema;

// Validate helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string; code?: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };

  const firstIssue = result.error.issues[0];
  const path = firstIssue?.path?.[0]?.toString() ?? '';
  const code = mapPathToErrorCode(path);
  return { success: false, error: firstIssue?.message ?? 'Validation failed', code };
}

function mapPathToErrorCode(path: string): string | undefined {
  const codeMap: Record<string, string> = {
    name: 'INVALID_NAME',
    email: 'INVALID_EMAIL',
    password: 'INVALID_PASSWORD',
    currentPassword: 'INVALID_PASSWORD',
    newPassword: 'INVALID_PASSWORD',
    credential: 'INVALID_CREDENTIAL',
    token: 'INVALID_TOKEN',
  };
  return codeMap[path];
}
