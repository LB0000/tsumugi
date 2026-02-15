import { API_BASE, buildAuthPostHeaders, fetchWithTimeout } from './common';
import { isErrorResponse } from './typeGuards';

export interface ReviewItem {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  category: 'pets' | 'family' | 'kids';
  styleId: string;
  createdAt: string;
}

export interface ReviewListResponse {
  success: true;
  reviews: ReviewItem[];
}

export interface ReviewSummaryResponse {
  success: true;
  averageRating: number;
  totalCount: number;
  countByCategory: Record<string, number>;
}

export interface PostReviewData {
  orderId: string;
  rating: number;
  comment: string;
  category: 'pets' | 'family' | 'kids';
  styleId: string;
}

export interface PostReviewResponse {
  success: true;
  review: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  };
}

function isReviewListResponse(data: unknown): data is ReviewListResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.success === true && Array.isArray(obj.reviews);
}

function isReviewSummaryResponse(data: unknown): data is ReviewSummaryResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.averageRating === 'number' &&
    typeof obj.totalCount === 'number'
  );
}

function isPostReviewResponse(data: unknown): data is PostReviewResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.success === true && typeof obj.review === 'object' && obj.review !== null;
}

export async function getReviews(category?: string, limit?: number, offset?: number): Promise<ReviewListResponse> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));

  const query = params.toString();
  const url = `${API_BASE}/reviews${query ? `?${query}` : ''}`;

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'レビューの取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isReviewListResponse(data)) {
    throw new Error('Invalid reviews response format');
  }

  return data;
}

export async function getReviewSummary(): Promise<ReviewSummaryResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/reviews/summary`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'レビューサマリーの取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isReviewSummaryResponse(data)) {
    throw new Error('Invalid review summary response format');
  }

  return data;
}

export async function postReview(data: PostReviewData): Promise<PostReviewResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/reviews`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const result: unknown = await response.json();
  if (!response.ok || isErrorResponse(result)) {
    const errorMessage = isErrorResponse(result) ? result.error.message : 'レビューの投稿に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isPostReviewResponse(result)) {
    throw new Error('Invalid post review response format');
  }

  return result;
}
