import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  createBackup,
  listBackups,
  deleteBackup,
} from '../lib/backup.js';

export const backupsRouter = Router();
backupsRouter.use(requireAuth);

backupsRouter.get('/', async (_req, res) => {
  try {
    const backups = await listBackups();
    res.json({ backups });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

backupsRouter.post('/create', async (_req, res) => {
  try {
    const result = await createBackup();
    if (!result.success) {
      res.status(500).json({ error: 'Backup creation failed' });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

backupsRouter.delete('/:filename', async (req, res) => {
  try {
    const success = await deleteBackup(req.params.filename);
    if (!success) {
      res.status(404).json({ error: 'Backup not found or invalid filename' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});
