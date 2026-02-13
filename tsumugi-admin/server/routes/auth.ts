import { Router } from 'express';
import { login, logout, requireAuth } from '../lib/auth.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }
  const token = login(password);
  if (!token) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  res.json({ token });
});

authRouter.post('/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.slice(7) || '';
  logout(token);
  res.json({ success: true });
});

authRouter.get('/check', requireAuth, (_req, res) => {
  res.json({ authenticated: true });
});
