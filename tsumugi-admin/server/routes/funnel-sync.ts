import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { systemStatus } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { autoSyncFunnelData, getYesterdayJST } from '../lib/funnel-auto-sync.js';

export const funnelSyncRouter = Router();
funnelSyncRouter.use(requireAuth);

funnelSyncRouter.get('/status', (_req, res) => {
  try {
    const row = db
      .select()
      .from(systemStatus)
      .where(eq(systemStatus.key, 'last_funnel_sync'))
      .get();
    res.json({ lastSync: row?.value ?? null });
  } catch (error) {
    console.error('Get funnel sync status error:', error);
    res.status(500).json({ error: 'Failed to get funnel sync status' });
  }
});

funnelSyncRouter.post('/trigger', async (req, res) => {
  try {
    const date = (req.body as { date?: string }).date || getYesterdayJST();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
      return;
    }

    const result = await autoSyncFunnelData(date);
    res.json(result);
  } catch (error) {
    console.error('Trigger funnel sync error:', error);
    res.status(500).json({ error: 'Failed to trigger funnel sync' });
  }
});
