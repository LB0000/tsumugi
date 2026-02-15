import path from 'path';
import { randomBytes } from 'crypto';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import { logger } from './logger.js';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  orderId: string;
  rating: number;
  comment: string;
  category: 'pets' | 'family' | 'kids';
  styleId: string;
  createdAt: string;
  isApproved: boolean;
}

interface PersistedReviewState {
  version: number;
  reviews: Review[];
}

const REVIEW_STORE_PATH = path.resolve(process.cwd(), 'server', '.data', 'review-store.json');
const reviews: Review[] = [];
const reviewsByOrder = new Map<string, string>(); // orderId -> reviewId
let persistQueue: Promise<void> = Promise.resolve();

function isReview(value: unknown): value is Review {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.userName === 'string' &&
    typeof obj.orderId === 'string' &&
    typeof obj.rating === 'number' &&
    typeof obj.comment === 'string' &&
    (obj.category === 'pets' || obj.category === 'family' || obj.category === 'kids') &&
    typeof obj.styleId === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.isApproved === 'boolean'
  );
}

function persistReviewState(): void {
  const snapshot: PersistedReviewState = {
    version: 1,
    reviews,
  };

  persistQueue = persistQueue
    .then(() => writeJsonAtomic(REVIEW_STORE_PATH, snapshot))
    .catch((error) => {
      logger.error('Failed to persist review state', { error: error instanceof Error ? error.message : String(error) });
    });
}

function hydrateReviewState(): void {
  const parsed = readJsonFile<PersistedReviewState>(REVIEW_STORE_PATH, {
    version: 1,
    reviews: [],
  });

  for (const review of parsed.reviews) {
    if (!isReview(review)) continue;
    reviews.push(review);
    reviewsByOrder.set(review.orderId, review.id);
  }
}

function generateReviewId(): string {
  return `REV-${Date.now()}-${randomBytes(4).toString('hex')}`;
}

export function addReview(review: Omit<Review, 'id' | 'createdAt' | 'isApproved'>): Review {
  const newReview: Review = {
    ...review,
    id: generateReviewId(),
    createdAt: new Date().toISOString(),
    isApproved: true,
  };
  reviews.push(newReview);
  reviewsByOrder.set(newReview.orderId, newReview.id);
  persistReviewState();
  return newReview;
}

export function getReviewsByCategory(category?: string, limit = 20, offset = 0): Review[] {
  let filtered = reviews.filter((r) => r.isApproved);
  if (category && category !== 'all') {
    filtered = filtered.filter((r) => r.category === category);
  }
  // Sort by newest first
  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return filtered.slice(offset, offset + limit);
}

export function getReviewSummary(): {
  averageRating: number;
  totalCount: number;
  countByCategory: Record<string, number>;
} {
  const approved = reviews.filter((r) => r.isApproved);
  const totalCount = approved.length;
  const averageRating = totalCount > 0
    ? Math.round((approved.reduce((sum, r) => sum + r.rating, 0) / totalCount) * 10) / 10
    : 0;

  const countByCategory: Record<string, number> = { pets: 0, family: 0, kids: 0 };
  for (const review of approved) {
    countByCategory[review.category] = (countByCategory[review.category] || 0) + 1;
  }

  return { averageRating, totalCount, countByCategory };
}

export function getRecentReviews(limit: number): Review[] {
  return reviews
    .filter((r) => r.isApproved)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function hasReviewForOrder(orderId: string): boolean {
  return reviewsByOrder.has(orderId);
}

hydrateReviewState();
