import { config } from '../config.js';
import { logger } from './logger.js';
import type { OrderPaymentStatus } from './checkoutTypes.js';

/**
 * LYLY PDF Generation System Integration
 *
 * Generates CSV from order data and calls LYLY API to create print-ready PDFs.
 * Uses existing LYLY templates as a temporary solution until TSUMUGI-specific templates are created.
 *
 * LYLY System: https://github.com/LB0000/lyly-pdf
 * Tech Stack: PHP 8.3 + TCPDF + FPDI
 */

// TSUMUGI productId → LYLY Product Title mapping
// NOTE: Using existing LYLY templates temporarily until TSUMUGI templates are created
const PRODUCT_TITLE_MAP: Record<string, string> = {
  'acrylic-stand': 'TSUMUGI アクリルスタンド',
  'canvas': 'TSUMUGI キャンバスアート',
  'phone-case': 'TSUMUGI スマホケース',
  'postcard': 'TSUMUGI ポストカード',
  // 'download': excluded (no PDF needed for digital download)
};

/**
 * LYLY CSV row format (based on actual LYLY specification)
 */
interface LylyCSVRow {
  Name: string;                  // # + order number (e.g., "#50001") - MUST include # prefix
  'Product Title': string;       // NAMES constant key (e.g., "TSUMUGI アクリルスタンド")
  'Order ID': number;            // Numeric order ID
  'Line Item Quantity': number;  // Quantity (default 1)
  image1: string;                // Image URL (HTTPS required, Supabase Storage)
}

/**
 * LYLY SSE API response event types
 */
interface LylySSEEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  total?: number;
  current?: number;
  name?: string;
  status?: 'processing' | 'success' | 'error';
  files?: string[];
  logs?: Array<{ name: string; status: string; message?: string }>;
  error?: string;
}

/**
 * LYLY generate response
 */
export interface LylyGenerateResponse {
  success: boolean;
  pdfUrl?: string;
  zipUrl?: string;
  logs: Array<{ name: string; status: string; message?: string }>;
  errors?: string[];
}

/**
 * Generates LYLY CSV content from order data
 *
 * @param order - Order payment status with items and image URLs
 * @returns CSV string or null if order has no physical products
 */
export function generateLylyCSV(order: OrderPaymentStatus): string | null {
  if (!order.items || order.items.length === 0) {
    return null;
  }

  // Filter out download products (digital-only)
  const physicalItems = order.items.filter((item) => item.productId !== 'download');

  if (physicalItems.length === 0) {
    return null; // No physical products, no PDF needed
  }

  const rows: LylyCSVRow[] = [];

  for (const item of physicalItems) {
    const productTitle = PRODUCT_TITLE_MAP[item.productId];

    if (!productTitle) {
      logger.warn('Product not mapped to LYLY template', {
        orderId: order.orderId,
        productId: item.productId,
      });
      continue; // Skip unmapped products
    }

    if (!item.imageUrl) {
      logger.warn('Product missing image URL', {
        orderId: order.orderId,
        productId: item.productId,
      });
      continue; // Skip items without images
    }

    // Validate image URL is HTTPS (LYLY requirement)
    if (!item.imageUrl.startsWith('https://')) {
      logger.error('Image URL must use HTTPS', {
        orderId: order.orderId,
        imageUrl: item.imageUrl,
      });
      continue;
    }

    rows.push({
      Name: `#${order.orderId}`,                    // Required # prefix
      'Product Title': productTitle,                 // LYLY NAMES constant key
      'Order ID': parseInt(order.orderId, 10) || 0,  // Numeric order ID
      'Line Item Quantity': item.quantity || 1,
      image1: item.imageUrl,
    });
  }

  if (rows.length === 0) {
    return null; // No valid rows
  }

  // Generate CSV with header
  const header = 'Name,Product Title,Order ID,Line Item Quantity,image1';
  const csvLines = rows.map((row) =>
    `"${row.Name}","${row['Product Title']}",${row['Order ID']},${row['Line Item Quantity']},"${row.image1}"`
  );

  return [header, ...csvLines].join('\n');
}

/**
 * Calls LYLY API to generate PDF from CSV
 *
 * Uses SSE (Server-Sent Events) API for progress tracking and timeout avoidance.
 *
 * @param csvContent - CSV string content
 * @param orderId - Order ID for logging
 * @returns LYLY generate response with PDF URL
 */
export async function callLylyAPI(
  csvContent: string,
  orderId: string
): Promise<LylyGenerateResponse> {
  if (!config.LYLY_API_URL || !config.LYLY_AUTH_TOKEN) {
    return {
      success: false,
      logs: [],
      errors: ['LYLY API configuration missing (LYLY_API_URL or LYLY_AUTH_TOKEN)'],
    };
  }

  const apiUrl = `${config.LYLY_API_URL}/api.php?action=generate_stream`;

  try {
    // Create FormData with CSV file
    const formData = new FormData();
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('csv', csvBlob, `order-${orderId}.csv`);
    formData.append('process', 'all');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.LYLY_AUTH_TOKEN}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('LYLY API request failed', {
        orderId,
        status: response.status,
        error: errorText,
      });
      return {
        success: false,
        logs: [],
        errors: [`LYLY API request failed: ${response.status} - ${errorText}`],
      };
    }

    // Parse SSE stream
    const responseText = await response.text();
    const sseEvents = parseSSEEvents(responseText);

    // Extract results from SSE events
    const completeEvent = sseEvents.find((e) => e.type === 'complete');
    const errorEvent = sseEvents.find((e) => e.type === 'error');

    if (errorEvent) {
      return {
        success: false,
        logs: errorEvent.logs || [],
        errors: [errorEvent.error || 'Unknown LYLY error'],
      };
    }

    if (!completeEvent || !completeEvent.files || completeEvent.files.length === 0) {
      return {
        success: false,
        logs: completeEvent?.logs || [],
        errors: ['No PDF files generated by LYLY'],
      };
    }

    // Construct PDF URL
    const pdfPath = completeEvent.files[0]; // e.g., "temp/20240101_123456.pdf"
    const pdfUrl = `${config.LYLY_API_URL}/${pdfPath}`;

    logger.info('LYLY PDF generated successfully', {
      orderId,
      pdfUrl,
      logs: completeEvent.logs,
    });

    return {
      success: true,
      pdfUrl,
      logs: completeEvent.logs || [],
    };
  } catch (error) {
    logger.error('LYLY API call exception', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      logs: [],
      errors: [error instanceof Error ? error.message : 'Unknown error calling LYLY API'],
    };
  }
}

/**
 * Parses SSE (Server-Sent Events) response text into event objects
 *
 * @param sseText - Raw SSE response text
 * @returns Array of parsed SSE events
 */
function parseSSEEvents(sseText: string): LylySSEEvent[] {
  const events: LylySSEEvent[] = [];
  const lines = sseText.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const dataStr = line.substring(6).trim();
      if (!dataStr) continue;

      try {
        const event = JSON.parse(dataStr) as LylySSEEvent;
        events.push(event);
      } catch {
        // Ignore malformed SSE data
      }
    }
  }

  return events;
}

/**
 * Generates PDF for an order with retry strategy
 *
 * @param order - Order payment status
 * @param maxRetries - Maximum retry attempts (default 3)
 * @returns LYLY generate response
 */
export async function generatePDFForOrder(
  order: OrderPaymentStatus,
  maxRetries = 3
): Promise<LylyGenerateResponse> {
  const csvContent = generateLylyCSV(order);

  if (!csvContent) {
    logger.info('No PDF generation needed for order', {
      orderId: order.orderId,
      reason: 'No physical products or missing images',
    });
    return {
      success: false,
      logs: [],
      errors: ['No physical products requiring PDF generation'],
    };
  }

  logger.info('Generating LYLY CSV for order', {
    orderId: order.orderId,
    csvLines: csvContent.split('\n').length - 1, // Exclude header
  });

  // Retry strategy with exponential backoff
  let lastError: LylyGenerateResponse | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.info('Calling LYLY API', {
      orderId: order.orderId,
      attempt,
      maxRetries,
    });

    const result = await callLylyAPI(csvContent, order.orderId);

    if (result.success) {
      return result;
    }

    lastError = result;

    if (attempt < maxRetries) {
      const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
      logger.warn('LYLY API call failed, retrying', {
        orderId: order.orderId,
        attempt,
        delayMs,
        errors: result.errors,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  logger.error('LYLY API call failed after all retries', {
    orderId: order.orderId,
    maxRetries,
    errors: lastError?.errors,
  });

  return lastError || {
    success: false,
    logs: [],
    errors: ['Failed after all retry attempts'],
  };
}
