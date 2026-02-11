import type { GenerateImageRequest, GenerateImageResponse, ArtStyle, PricingPlan, PrintSize, ShippingAddress } from '../types';

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
    typeof obj.isIntelligent === 'boolean' &&
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
  items: Array<{ name: string; quantity: number; price: number }>;
  shippingAddress: ShippingAddress;
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
  totalAmount: number;
}

interface ProcessPaymentResponse {
  success: true;
  paymentId: string;
  orderId: string;
  status: string;
  receiptUrl?: string;
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

  return data as CreateOrderResponse;
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

  return data as ProcessPaymentResponse;
}
