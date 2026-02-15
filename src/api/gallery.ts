import { API_BASE, buildAuthActionHeaders, fetchWithTimeout } from './common';
import { isErrorResponse, isGalleryResponse } from './typeGuards';

export interface GalleryItemData {
  id: string;
  userId: string;
  imageFileName: string;
  thumbnailFileName: string;
  artStyleId: string;
  artStyleName: string;
  createdAt: string;
}

export interface GalleryResponse {
  success: true;
  items: GalleryItemData[];
}

export async function getGallery(): Promise<GalleryItemData[]> {
  const response = await fetchWithTimeout(`${API_BASE}/gallery`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'ギャラリーの取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isGalleryResponse(data)) {
    throw new Error('Invalid gallery response format');
  }

  return data.items;
}

export async function deleteGalleryItem(itemId: string): Promise<void> {
  const headers = await buildAuthActionHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/gallery/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '作品の削除に失敗しました';
    throw new Error(errorMessage);
  }
}

export function getGalleryImageUrl(itemId: string): string {
  return `${API_BASE}/gallery/${encodeURIComponent(itemId)}/image`;
}

export function getGalleryThumbnailUrl(itemId: string): string {
  return `${API_BASE}/gallery/${encodeURIComponent(itemId)}/thumbnail`;
}
