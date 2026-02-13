import type { GenerateImageRequest, GenerateImageResponse, ArtStyle, PricingPlan, PrintSize, ShippingAddress, AuthUser } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

interface StylesResponse {
  success: true;
  styles: ArtStyle[];
}

interface PricingResponse {
  success: true;
  plans: PricingPlan[];
  printSizes: PrintSize[];
}

// Type guard for GenerateImageResponse validation
function isGenerateImageResponse(data: unknown): data is GenerateImageResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.projectId === 'string' &&
    typeof obj.generatedImage === 'string' &&
    typeof obj.thumbnailImage === 'string' &&
    typeof obj.watermarked === 'boolean' &&
    typeof obj.creditsUsed === 'number' &&
    typeof obj.creditsRemaining === 'number'
  );
}

// Type guard for ErrorResponse validation
function isErrorResponse(data: unknown): data is ErrorResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === false &&
    typeof obj.error === 'object' &&
    obj.error !== null &&
    typeof (obj.error as Record<string, unknown>).message === 'string'
  );
}

// Type guard for ArtStyle validation
function isArtStyle(data: unknown): data is ArtStyle {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.thumbnailUrl === 'string' &&
    Array.isArray(obj.colorPalette) &&
    (obj.tier === 'free' || obj.tier === 'starter' || obj.tier === 'studio')
  );
}

// Type guard for StylesResponse validation
function isStylesResponse(data: unknown): data is StylesResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    Array.isArray(obj.styles) &&
    obj.styles.every(isArtStyle)
  );
}

// Type guard for PricingResponse validation
function isPricingResponse(data: unknown): data is PricingResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    Array.isArray(obj.plans) &&
    Array.isArray(obj.printSizes)
  );
}

export async function generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse> {
  const response = await fetch(`${API_BASE}/generate-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data)
      ? data.error.message
      : 'Failed to generate image';
    throw new Error(errorMessage);
  }

  if (!isGenerateImageResponse(data)) {
    throw new Error('Invalid response format from server');
  }

  return data;
}

export async function getStyles(): Promise<ArtStyle[]> {
  const response = await fetch(`${API_BASE}/styles`);
  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data)
      ? data.error.message
      : 'Failed to fetch styles';
    throw new Error(errorMessage);
  }

  if (!isStylesResponse(data)) {
    throw new Error('Invalid styles response format from server');
  }

  return data.styles;
}

export async function getPricing(): Promise<PricingResponse> {
  const response = await fetch(`${API_BASE}/pricing`);
  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data)
      ? data.error.message
      : 'Failed to fetch pricing';
    throw new Error(errorMessage);
  }

  if (!isPricingResponse(data)) {
    throw new Error('Invalid pricing response format from server');
  }

  return data;
}

interface CreateOrderRequest {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: ShippingAddress;
  clientRequestId?: string;
}

interface CreateOrderResponse {
  success: true;
  orderId: string;
  totalAmount: number;
}

interface ProcessPaymentRequest {
  sourceId: string;
  orderId: string;
  buyerEmail: string;
  clientRequestId?: string;
}

interface ProcessPaymentResponse {
  success: true;
  paymentId: string;
  orderId: string;
  status: string;
  receiptUrl?: string;
}

interface ContactRequest {
  reason: 'order' | 'product' | 'other';
  name: string;
  email: string;
  orderNumber?: string;
  message: string;
}

interface ContactResponse {
  success: true;
  inquiryId: string;
  estimatedReplyBusinessDays: number;
}

interface SupportChatRequest {
  message?: string;
  actionId?: string;
}

interface SupportChatResponse {
  success: true;
  reply: string;
  suggestedNextActions: string[];
}

interface AuthResponse {
  success: true;
  user: AuthUser;
}

interface ForgotPasswordResponse {
  success: true;
  message: string;
  resetToken?: string | null;
}

interface CurrentUserResponse {
  success: true;
  user: AuthUser;
}

interface CsrfResponse {
  success: true;
  csrfToken: string;
}

function isCreateOrderResponse(data: unknown): data is CreateOrderResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.orderId === 'string' &&
    typeof obj.totalAmount === 'number'
  );
}

function isProcessPaymentResponse(data: unknown): data is ProcessPaymentResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.paymentId === 'string' &&
    typeof obj.orderId === 'string' &&
    typeof obj.status === 'string'
  );
}

function isContactResponse(data: unknown): data is ContactResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.inquiryId === 'string' &&
    typeof obj.estimatedReplyBusinessDays === 'number'
  );
}

function isSupportChatResponse(data: unknown): data is SupportChatResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.reply === 'string' &&
    Array.isArray(obj.suggestedNextActions)
  );
}

function isAuthResponse(data: unknown): data is AuthResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  const user = obj.user as Record<string, unknown> | undefined;
  return (
    obj.success === true &&
    !!user &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string'
  );
}

function isForgotPasswordResponse(data: unknown): data is ForgotPasswordResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  const resetToken = obj.resetToken;
  return (
    obj.success === true &&
    typeof obj.message === 'string' &&
    (resetToken === undefined || resetToken === null || typeof resetToken === 'string')
  );
}

function isCurrentUserResponse(data: unknown): data is CurrentUserResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  const user = obj.user as Record<string, unknown> | undefined;
  return (
    obj.success === true &&
    !!user &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string'
  );
}

function isCsrfResponse(data: unknown): data is CsrfResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.csrfToken === 'string'
  );
}

async function getFreshCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'CSRFトークンの取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCsrfResponse(data)) {
    throw new Error('Invalid csrf response format');
  }

  return data.csrfToken;
}

async function buildAuthPostHeaders(): Promise<Record<string, string>> {
  const csrfToken = await getFreshCsrfToken();
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  };
}

async function buildAuthActionHeaders(): Promise<Record<string, string>> {
  const csrfToken = await getFreshCsrfToken();
  return {
    'X-CSRF-Token': csrfToken,
  };
}

export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  const response = await fetch(`${API_BASE}/checkout/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '注文の作成に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCreateOrderResponse(data)) {
    throw new Error('Invalid create-order response format');
  }

  return data;
}

export async function processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
  const response = await fetch(`${API_BASE}/checkout/process-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '決済処理に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isProcessPaymentResponse(data)) {
    throw new Error('Invalid payment response format');
  }

  return data;
}

export async function submitContact(request: ContactRequest): Promise<ContactResponse> {
  const response = await fetch(`${API_BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'お問い合わせの送信に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isContactResponse(data)) {
    throw new Error('Invalid contact response format');
  }

  return data;
}

export async function sendSupportChat(request: SupportChatRequest): Promise<SupportChatResponse> {
  const response = await fetch(`${API_BASE}/support/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'サポートへの送信に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isSupportChatResponse(data)) {
    throw new Error('Invalid support response format');
  }

  return data;
}

export async function loginAuth(request: { email: string; password: string }): Promise<AuthResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'ログインに失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAuthResponse(data)) {
    throw new Error('Invalid login response format');
  }

  return data;
}

export async function registerAuth(request: { name: string; email: string; password: string }): Promise<AuthResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '登録に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAuthResponse(data)) {
    throw new Error('Invalid register response format');
  }

  return data;
}

export async function forgotPassword(request: { email: string }): Promise<ForgotPasswordResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'パスワード再設定の送信に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isForgotPasswordResponse(data)) {
    throw new Error('Invalid forgot-password response format');
  }

  return data;
}

export async function resetPassword(request: { token: string; newPassword: string }): Promise<AuthResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'パスワード再設定に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAuthResponse(data)) {
    throw new Error('Invalid reset-password response format');
  }

  return data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'セッション確認に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCurrentUserResponse(data)) {
    throw new Error('Invalid current-user response format');
  }

  return data.user;
}

export async function logoutAuth(): Promise<void> {
  const headers = await buildAuthActionHeaders();
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'ログアウトに失敗しました';
    throw new Error(errorMessage);
  }
}
