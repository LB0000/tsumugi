import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  getCohortAnalysis,
  getAtRiskCustomers,
  getLtvDistribution,
  getRetentionSummary,
} from '../lib/retention-analytics.js';

export const retentionRouter = Router();

retentionRouter.use(requireAuth);

retentionRouter.get('/cohorts', (_req, res) => {
  try {
    res.json(getCohortAnalysis());
  } catch (error) {
    console.error('Cohort analysis error:', error);
    res.status(500).json({ error: 'Failed to get cohort analysis' });
  }
});

retentionRouter.get('/at-risk', (_req, res) => {
  try {
    res.json(getAtRiskCustomers());
  } catch (error) {
    console.error('At-risk customers error:', error);
    res.status(500).json({ error: 'Failed to get at-risk customers' });
  }
});

retentionRouter.get('/ltv', (_req, res) => {
  try {
    res.json(getLtvDistribution());
  } catch (error) {
    console.error('LTV distribution error:', error);
    res.status(500).json({ error: 'Failed to get LTV distribution' });
  }
});

retentionRouter.get('/summary', (_req, res) => {
  try {
    res.json(getRetentionSummary());
  } catch (error) {
    console.error('Retention summary error:', error);
    res.status(500).json({ error: 'Failed to get retention summary' });
  }
});
