import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  listAlerts,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAlert,
} from '../lib/alerts.js';

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

alertsRouter.get('/', (req, res) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const items = listAlerts({ limit, unreadOnly });
    res.json({ alerts: items });
  } catch (error) {
    console.error('List alerts error:', error);
    res.status(500).json({ error: 'Failed to list alerts' });
  }
});

alertsRouter.get('/unread-count', (_req, res) => {
  try {
    const count = getUnreadCount();
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

alertsRouter.patch('/:id/read', (req, res) => {
  try {
    markAsRead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark alert read error:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

alertsRouter.post('/mark-all-read', (_req, res) => {
  try {
    markAllAsRead();
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all alerts as read' });
  }
});

alertsRouter.delete('/:id', (req, res) => {
  try {
    deleteAlert(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});
