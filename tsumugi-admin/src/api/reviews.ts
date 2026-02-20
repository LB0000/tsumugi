import type { Review, ReviewSummary } from '../types/reviews';
import { apiFetch } from './index';

export async function getReviews(): Promise<Review[]> {
  const data = await apiFetch<Review[] | { reviews: Review[] }>('/reviews');
  return Array.isArray(data) ? data : data.reviews;
}

export async function getReviewSummary(): Promise<ReviewSummary> {
  return apiFetch<ReviewSummary>('/reviews/summary');
}
