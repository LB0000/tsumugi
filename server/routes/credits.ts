/**
 * Credits API routes
 * Handles credit balance queries and transaction history
 */

import { Router, Request, Response } from 'express';
import { requireAuth, getAuthUser } from '../middleware/requireAuth.js';
import { getUserCredits, initializeUserCredits, getUserTransactions } from '../lib/credits.js';
import { FREE_CREDITS, CREDITS_PER_PACK, PACK_PRICE_YEN, PRICE_PER_GENERATION } from '../lib/creditTypes.js';
import { csrfProtection } from '../middleware/csrfProtection.js';

export const creditsRouter = Router();
creditsRouter.use(csrfProtection());

/**
 * GET /api/credits
 * Get current user's credit balance
 * Requires authentication
 */
creditsRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const user = getAuthUser(res);
  let balance = getUserCredits(user.id);

  // Lazy initialization: if user has no credit record, create one
  if (!balance) {
    balance = initializeUserCredits(user.id);
  }

  res.json({
    success: true,
    credits: {
      freeRemaining: balance.freeRemaining,
      paidRemaining: balance.paidRemaining,
      totalRemaining: balance.freeRemaining + balance.paidRemaining,
      totalUsed: balance.totalUsed,
    },
  });
});

/**
 * GET /api/credits/transactions
 * Get current user's transaction history
 * Requires authentication
 */
creditsRouter.get('/transactions', requireAuth, (req: Request, res: Response) => {
  const user = getAuthUser(res);
  const transactions = getUserTransactions(user.id);

  res.json({
    success: true,
    transactions: transactions.map(txn => ({
      id: txn.id,
      type: txn.type,
      amount: txn.amount,
      description: txn.description,
      createdAt: txn.createdAt,
      referenceId: txn.referenceId,
    })),
  });
});

/**
 * GET /api/credits/pricing
 * Get pricing information (no auth required)
 */
creditsRouter.get('/pricing', (_req: Request, res: Response) => {
  res.json({
    success: true,
    pricing: {
      freeCredits: FREE_CREDITS,
      packCredits: CREDITS_PER_PACK,
      packPriceYen: PACK_PRICE_YEN,
      pricePerGeneration: PRICE_PER_GENERATION,
    },
  });
});
