import { config } from '../config.js';

/**
 * Supabase Storage API client for portrait image uploads
 *
 * Uploads base64 JPEG images to Supabase Storage and returns public URLs.
 * Uses the `portraits` bucket with public read access.
 */

const STORAGE_BUCKET = 'portraits';
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

// Allowed MIME types (whitelist)
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// MIME type to file extension mapping
const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface UploadImageResult {
  success: true;
  publicUrl: string;
  path: string;
  size: number;
}

export interface UploadImageError {
  success: false;
  error: string;
}

/**
 * Converts base64 data URL to Blob
 */
function base64ToBlob(dataUrl: string): { blob: Blob; mimeType: string } | null {
  // Expected format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
  if (!match) {
    return null;
  }

  const [, mimeType, base64Data] = match;

  // Decode base64 to binary string
  let binaryString: string;
  try {
    binaryString = atob(base64Data);
  } catch {
    return null;
  }

  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return {
    blob: new Blob([bytes], { type: mimeType }),
    mimeType,
  };
}

/**
 * Generates a unique file path for the uploaded image
 * Format: orders/{orderId}/{timestamp}-{random}.{ext}
 *
 * Security: Sanitizes orderId to prevent path traversal attacks
 */
function generateImagePath(orderId: string, mimeType: string): string {
  // [M8] Sanitize orderId to prevent path traversal (e.g., "../../../etc/passwd")
  const sanitizedOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '_');

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);

  // [M6] Extract extension from MIME type for correct file extension
  const extension = EXTENSION_MAP[mimeType] || 'jpg';

  return `orders/${sanitizedOrderId}/${timestamp}-${random}.${extension}`;
}

/**
 * Uploads base64 image to Supabase Storage
 *
 * @param base64Image - Base64-encoded image data URL (e.g., "data:image/jpeg;base64,...")
 * @param orderId - Order ID for file organization
 * @returns Upload result with public URL or error
 */
export async function uploadImageToStorage(
  base64Image: string,
  orderId: string
): Promise<UploadImageResult | UploadImageError> {
  // Validate Supabase configuration
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      success: false,
      error: 'Supabase configuration missing',
    };
  }

  // Convert base64 to Blob
  const conversion = base64ToBlob(base64Image);
  if (!conversion) {
    return {
      success: false,
      error: 'Invalid base64 image format',
    };
  }

  const { blob, mimeType } = conversion;

  // Validate image size
  if (blob.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      success: false,
      error: `Image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit`,
    };
  }

  // [HIGH] Validate MIME type against whitelist (prevents unsupported types like BMP/TIFF)
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      success: false,
      error: `Unsupported image type: ${mimeType}. Allowed: JPEG, PNG, WebP, GIF`,
    };
  }

  // Generate unique path with correct extension
  const path = generateImagePath(orderId, mimeType);

  // Upload to Supabase Storage
  const uploadUrl = `${config.SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`;

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': mimeType,
      },
      body: blob,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Upload failed: ${response.status} - ${errorText}`,
      };
    }

    // Generate public URL
    const publicUrl = `${config.SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;

    return {
      success: true,
      publicUrl,
      path,
      size: blob.size,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Deletes an image from Supabase Storage
 *
 * @param path - Image path in storage (e.g., "orders/123/1234567890-abc.jpg")
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteImageFromStorage(path: string): Promise<boolean> {
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase configuration missing');
    return false;
  }

  // [HIGH] Prevent path traversal attacks
  if (path.includes('..') || !path.startsWith('orders/')) {
    console.error('Invalid image path for deletion:', path);
    return false;
  }

  const deleteUrl = `${config.SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`;

  try {
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to delete image:', error);
    return false;
  }
}
