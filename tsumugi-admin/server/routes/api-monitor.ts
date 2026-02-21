import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { getApiStats, runHealthChecks } from '../lib/api-monitor.js';

export const apiMonitorRouter = Router();
apiMonitorRouter.use(requireAuth);

apiMonitorRouter.get('/stats', (req, res) => {
  try {
    const service = req.query.service as string | undefined;
    const hours = req.query.hours ? Number(req.query.hours) : 24;
    const stats = getApiStats(service, hours);
    res.json({ stats });
  } catch (error) {
    console.error('Get API stats error:', error);
    res.status(500).json({ error: 'Failed to get API stats' });
  }
});

apiMonitorRouter.post('/health-check', async (_req, res) => {
  try {
    const results = await runHealthChecks();
    res.json({ results });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Failed to run health checks' });
  }
});
