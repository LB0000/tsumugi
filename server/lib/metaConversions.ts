import { createHash } from 'crypto';
import { config } from '../config.js';
import { logger } from './logger.js';

const GRAPH_API_VERSION = 'v21.0';

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhoneJP(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0') && (digits.length === 10 || digits.length === 11)) {
    return '81' + digits.slice(1);
  }
  return digits;
}

interface UserData {
  email?: string;
  phone?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
}

interface PurchaseEventParams {
  eventId: string;
  orderId: string;
  value: number;
  currency: string;
  contentIds: string[];
  userData: UserData;
  eventSourceUrl?: string;
}

export async function sendPurchaseEvent(params: PurchaseEventParams): Promise<boolean> {
  const accessToken = config.META_CONVERSIONS_API_TOKEN;
  const pixelId = config.META_PIXEL_ID;

  if (!accessToken || !pixelId) {
    logger.info('Meta CAPI not configured, skipping Purchase event');
    return false;
  }

  const hashedUserData: Record<string, string> = {};
  if (params.userData.email) {
    hashedUserData.em = sha256(params.userData.email);
  }
  if (params.userData.phone) {
    hashedUserData.ph = sha256(normalizePhoneJP(params.userData.phone));
  }
  if (params.userData.clientIpAddress) {
    hashedUserData.client_ip_address = params.userData.clientIpAddress;
  }
  if (params.userData.clientUserAgent) {
    hashedUserData.client_user_agent = params.userData.clientUserAgent;
  }
  if (params.userData.fbc) {
    hashedUserData.fbc = params.userData.fbc;
  }
  if (params.userData.fbp) {
    hashedUserData.fbp = params.userData.fbp;
  }

  const eventData = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        event_source_url: params.eventSourceUrl,
        action_source: 'website',
        user_data: hashedUserData,
        custom_data: {
          currency: params.currency,
          value: params.value,
          content_ids: params.contentIds,
          content_type: 'product',
          order_id: params.orderId,
        },
      },
    ],
    access_token: accessToken,
  };

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error('Meta CAPI Purchase event failed', { status: response.status, body });
      return false;
    }

    logger.info('Meta CAPI Purchase event sent', { eventId: params.eventId, orderId: params.orderId });
    return true;
  } catch (error) {
    logger.error('Meta CAPI request error', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
