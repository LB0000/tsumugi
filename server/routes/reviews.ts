import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../lib/schemas.js';
import { logger } from '../lib/logger.js';
import { requireAuth, getAuthUser } from '../middleware/requireAuth.js';
import { csrfProtection } from '../middleware/csrfProtection.js';
import { getOrderPaymentStatus } from '../lib/checkoutState.js';
import {
  addReview,
  getReviewsByCategory,
  getReviewSummary,
  hasReviewForOrder,
} from '../lib/reviewStore.js';

export const reviewRouter = Router();
reviewRouter.use(csrfProtection({ methods: ['POST'] }));

const getReviewsQuerySchema = z.object({
  category: z.enum(['pets', 'family', 'kids']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const postReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500),
  category: z.enum(['pets', 'family', 'kids']),
  styleId: z.string().min(1),
});

// GET /api/reviews
reviewRouter.get('/', (req, res) => {
  try {
    const parsed = validate(getReviewsQuerySchema, req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: parsed.error },
      });
      return;
    }

    const { category, limit = 20, offset = 0 } = parsed.data;
    const reviews = getReviewsByCategory(category, limit, offset);

    res.json({
      success: true,
      reviews: reviews.map((r) => ({
        id: r.id,
        userName: r.userName,
        rating: r.rating,
        comment: r.comment,
        category: r.category,
        styleId: r.styleId,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Get reviews error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'GET_REVIEWS_FAILED', message: 'レビューの取得に失敗しました' },
    });
  }
});

// GET /api/reviews/summary
reviewRouter.get('/summary', (_req, res) => {
  try {
    const summary = getReviewSummary();
    res.json({ success: true, ...summary });
  } catch (error) {
    logger.error('Get review summary error', { error: error instanceof Error ? error.message : String(error), requestId: _req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'GET_SUMMARY_FAILED', message: 'レビューサマリーの取得に失敗しました' },
    });
  }
});

// POST /api/reviews
reviewRouter.post('/', requireAuth, (req, res) => {
  try {
    const user = getAuthUser(res);

    const parsed = validate(postReviewSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: parsed.code || 'INVALID_REQUEST', message: parsed.error },
      });
      return;
    }

    const { orderId, rating, comment, category, styleId } = parsed.data;

    // Verify order exists and belongs to user
    const orderStatus = getOrderPaymentStatus(orderId);
    if (!orderStatus || orderStatus.userId !== user.id) {
      res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: '注文が見つかりません' },
      });
      return;
    }

    // Check duplicate
    if (hasReviewForOrder(orderId)) {
      res.status(409).json({
        success: false,
        error: { code: 'REVIEW_ALREADY_EXISTS', message: 'この注文には既にレビューが投稿されています' },
      });
      return;
    }

    const review = addReview({
      userId: user.id,
      userName: user.name,
      orderId,
      rating,
      comment: comment.trim(),
      category,
      styleId,
    });

    logger.info('Review created', { reviewId: review.id, orderId, userId: user.id, requestId: req.requestId });

    res.json({
      success: true,
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    logger.error('Post review error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'POST_REVIEW_FAILED', message: 'レビューの投稿に失敗しました' },
    });
  }
});
