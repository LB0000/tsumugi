import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { config } from '../config.js';

export const reviewsRouter = Router();
reviewsRouter.use(requireAuth);

const TSUMUGI_API_URL = `${config.TSUMUGI_API_URL}/api`;

function isValidReview(r: unknown): boolean {
  if (typeof r !== 'object' || r === null) return false;
  const obj = r as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.rating === 'number' && typeof obj.comment === 'string';
}

reviewsRouter.get('/', async (_req, res) => {
  try {
    const response = await fetch(`${TSUMUGI_API_URL}/reviews`);
    if (!response.ok) {
      res.status(502).json({ error: 'Main service returned an error', reviews: [] });
      return;
    }
    const data: unknown = await response.json();
    const reviews = Array.isArray(data) ? data : (data as { reviews?: unknown[] })?.reviews;
    if (!Array.isArray(reviews) || !reviews.every(isValidReview)) {
      res.status(502).json({ error: 'Invalid response from main service', reviews: [] });
      return;
    }
    res.json(reviews);
  } catch (error) {
    console.error('Reviews proxy error:', error);
    res.status(502).json({ error: 'Main service unavailable', reviews: [] });
  }
});

reviewsRouter.get('/summary', async (_req, res) => {
  try {
    const response = await fetch(`${TSUMUGI_API_URL}/reviews/summary`);
    if (!response.ok) {
      res.status(502).json({ error: 'Main service returned an error' });
      return;
    }
    const data: unknown = await response.json();
    const obj = data as Record<string, unknown>;
    if (typeof obj.totalReviews !== 'number' || typeof obj.averageRating !== 'number') {
      res.status(502).json({ error: 'Invalid response from main service' });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error('Reviews summary proxy error:', error);
    res.status(502).json({ error: 'Main service unavailable' });
  }
});
