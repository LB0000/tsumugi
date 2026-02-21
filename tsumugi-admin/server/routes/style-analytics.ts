import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { config } from '../config.js';

export const styleAnalyticsRouter = Router();
styleAnalyticsRouter.use(requireAuth);

const REQUEST_TIMEOUT_MS = 10_000;

styleAnalyticsRouter.get('/', async (_req, res) => {
  const tsumugiApiUrl = config.TSUMUGI_API_URL;
  const internalKey = config.INTERNAL_API_KEY;

  if (!internalKey) {
    res.status(503).json({ error: 'INTERNAL_API_KEY is not configured' });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${tsumugiApiUrl}/api/internal/style-analytics`, {
      headers: { 'X-Internal-Key': internalKey },
      signal: controller.signal,
    });

    if (!response.ok) {
      const status = response.status >= 400 && response.status < 600 ? response.status : 502;
      res.status(status).json({ error: `Upstream error: ${response.status}` });
      return;
    }

    const data = await response.json() as { styles?: unknown; totalGenerations?: unknown };
    if (!Array.isArray(data.styles) || typeof data.totalGenerations !== 'number') {
      res.status(502).json({ error: 'Invalid response from main server' });
      return;
    }
    res.json({ styles: data.styles, totalGenerations: data.totalGenerations });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      res.status(504).json({ error: 'Request to main server timed out' });
      return;
    }
    res.status(502).json({ error: 'Failed to fetch style analytics from main server' });
  } finally {
    clearTimeout(timeoutId);
  }
});
