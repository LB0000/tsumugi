import { API_BASE, buildAuthPostHeaders, fetchWithTimeout } from './common';
import { isErrorResponse } from './typeGuards';

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

function isPostReviewResponse(data: unknown): data is PostReviewResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.success === true && typeof obj.review === 'object' && obj.review !== null;
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
