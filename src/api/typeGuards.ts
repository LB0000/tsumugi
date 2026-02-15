import type { GenerateImageResponse, ArtStyle } from '../types';
import type { ErrorResponse, CsrfResponse } from './common';
import type { StylesResponse, PricingResponse } from './image';
import type { CreateOrderResponse, ProcessPaymentResponse, OrdersResponse, OrderDetailResponse } from './checkout';
import type { ContactResponse, SupportChatResponse } from './support';
import type { AuthResponse, ForgotPasswordResponse, CurrentUserResponse } from './auth';
import type { AddressesResponse, AddressSaveResponse } from './addresses';
import type { GalleryResponse } from './gallery';

// Type guard for GenerateImageResponse validation
export function isGenerateImageResponse(data: unknown): data is GenerateImageResponse {
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
export function isErrorResponse(data: unknown): data is ErrorResponse {
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
export function isArtStyle(data: unknown): data is ArtStyle {
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
export function isStylesResponse(data: unknown): data is StylesResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    Array.isArray(obj.styles) &&
    obj.styles.every(isArtStyle)
  );
}

// Type guard for PricingResponse validation
export function isPricingResponse(data: unknown): data is PricingResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    Array.isArray(obj.plans) &&
    Array.isArray(obj.printSizes)
  );
}

export function isCreateOrderResponse(data: unknown): data is CreateOrderResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.orderId === 'string' &&
    typeof obj.totalAmount === 'number'
  );
}

export function isProcessPaymentResponse(data: unknown): data is ProcessPaymentResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.paymentId === 'string' &&
    typeof obj.orderId === 'string' &&
    typeof obj.status === 'string'
  );
}

export function isContactResponse(data: unknown): data is ContactResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.inquiryId === 'string' &&
    typeof obj.estimatedReplyBusinessDays === 'number'
  );
}

export function isSupportChatResponse(data: unknown): data is SupportChatResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.reply === 'string' &&
    Array.isArray(obj.suggestedNextActions)
  );
}

export function isAuthResponse(data: unknown): data is AuthResponse {
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

export function isForgotPasswordResponse(data: unknown): data is ForgotPasswordResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.message === 'string'
  );
}

export function isCurrentUserResponse(data: unknown): data is CurrentUserResponse {
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

export function isCsrfResponse(data: unknown): data is CsrfResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.csrfToken === 'string'
  );
}

export function isOrdersResponse(data: unknown): data is OrdersResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.success === true && Array.isArray(obj.orders);
}

export function isOrderDetailResponse(data: unknown): data is OrderDetailResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.success === true && typeof obj.order === 'object' && obj.order !== null;
}

export function isAddressesResponse(data: unknown): data is AddressesResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.success === true && Array.isArray(obj.addresses);
}

export function isAddressSaveResponse(data: unknown): data is AddressSaveResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.success === true && typeof obj.address === 'object' && obj.address !== null;
}

export function isGalleryResponse(data: unknown): data is GalleryResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.success === true && Array.isArray(obj.items);
}
