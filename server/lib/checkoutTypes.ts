export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;  // Supabase Storage public URL (Phase 6)
  options?: Record<string, unknown>;  // Product options, e.g., { portraitName: string }
}

export interface OrderShippingAddress {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine: string;
}

export interface OrderGiftInfo {
  wrappingId?: string;
  noshiType?: string;
  messageCard?: string;
  recipientAddress?: OrderShippingAddress;
}

export interface OrderPaymentStatus {
  orderId: string;
  paymentId: string;
  status: string;
  updatedAt: string;
  userId?: string;
  totalAmount?: number;
  createdAt?: string;
  items?: OrderItem[];
  shippingAddress?: OrderShippingAddress;
  receiptUrl?: string;
  couponCode?: string;
  couponUsed?: boolean;
  giftInfo?: OrderGiftInfo;
  // Phase 7: LYLY PDF generation
  printDataUrl?: string;  // LYLY generated PDF URL
  printDataStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  printDataError?: string;  // Error message if PDF generation failed
}

export interface ProcessedWebhookEvent {
  eventId: string;
  eventType: string;
  receivedAt: string;
  orderId?: string;
  paymentId?: string;
  status?: string;
}

export interface PersistedCheckoutState {
  version: number;
  processedEvents: ProcessedWebhookEvent[];
  paymentStatuses: OrderPaymentStatus[];
}
