/**
 * Unit tests for email service
 * Tests all email sending functions, error handling, and Resend API integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (before imports) ────────────────────────────

const mockSend = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mockSend } };
  }),
}));

vi.mock('../../config.js', () => ({
  config: {
    FRONTEND_URL: 'https://tsumugi-art.com',
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ── Imports ───────────────────────────────────────────

import { logger } from '../../lib/logger.js';

// ── Helpers ───────────────────────────────────────────

/**
 * Dynamic import with env overrides.
 * Since email.ts reads RESEND_API_KEY at module-level,
 * we need to set env vars before importing.
 */
async function importEmailModule(envOverrides: Record<string, string> = {}) {
  const originalEnv = { ...process.env };

  // Set defaults
  process.env.RESEND_API_KEY = envOverrides.RESEND_API_KEY ?? 'test-api-key';
  process.env.FROM_EMAIL = envOverrides.FROM_EMAIL ?? 'noreply@tsumugi-art.com';
  process.env.NODE_ENV = envOverrides.NODE_ENV ?? 'test';

  // Apply overrides
  for (const [key, value] of Object.entries(envOverrides)) {
    process.env[key] = value;
  }

  // Clear module cache so module-level code re-runs
  vi.resetModules();

  const mod = await import('../../lib/email.js');

  // Restore env
  Object.assign(process.env, originalEnv);

  return mod;
}

// ── Tests ─────────────────────────────────────────────

describe('Email Service', () => {
  let emailModule: Awaited<ReturnType<typeof importEmailModule>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ id: 'email-id-123' });
    emailModule = await importEmailModule();
  });

  // ─── sendVerificationEmail ──────────────────────────

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct URL', async () => {
      const result = await emailModule.sendVerificationEmail('user@example.com', 'abc-token-123');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledOnce();

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toContain('メールアドレスの確認');
      expect(callArgs.html).toContain('verify-email?token=abc-token-123');
    });

    it('should include TSUMUGI branding in subject', async () => {
      await emailModule.sendVerificationEmail('user@example.com', 'token');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain('紡 TSUMUGI');
    });

    it('should include from address with app name', async () => {
      await emailModule.sendVerificationEmail('user@example.com', 'token');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toContain('紡 TSUMUGI');
    });

    it('should encode special characters in token', async () => {
      await emailModule.sendVerificationEmail('user@example.com', 'tok en&special=chars');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('tok%20en%26special%3Dchars');
    });

    it('should mention 30-minute validity in HTML', async () => {
      await emailModule.sendVerificationEmail('user@example.com', 'token');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('30分間有効');
    });

    it('should wrap HTML in proper email template', async () => {
      await emailModule.sendVerificationEmail('user@example.com', 'token');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('<!DOCTYPE html>');
      expect(callArgs.html).toContain('<html lang="ja">');
      expect(callArgs.html).toContain('TSUMUGI');
    });

    it('should return false on Resend API error', async () => {
      mockSend.mockRejectedValueOnce(new Error('API error'));

      const result = await emailModule.sendVerificationEmail('user@example.com', 'token');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send verification email',
        expect.objectContaining({ error: 'API error' }),
      );
    });

    it('should return false on timeout', async () => {
      mockSend.mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 5)),
      );

      const result = await emailModule.sendVerificationEmail('user@example.com', 'token');

      expect(result).toBe(false);
    });
  });

  // ─── sendPasswordResetEmail ─────────────────────────

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct URL', async () => {
      const result = await emailModule.sendPasswordResetEmail('user@example.com', 'reset-token-xyz');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledOnce();

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.html).toContain('reset-password?token=reset-token-xyz');
    });

    it('should include password reset subject line', async () => {
      await emailModule.sendPasswordResetEmail('user@example.com', 'token');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain('パスワード再設定');
    });

    it('should mention 30-minute validity', async () => {
      await emailModule.sendPasswordResetEmail('user@example.com', 'token');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('30分間有効');
    });

    it('should include instruction to ignore if unrecognized', async () => {
      await emailModule.sendPasswordResetEmail('user@example.com', 'token');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('心当たりがない場合');
    });

    it('should return false on Resend API error', async () => {
      mockSend.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await emailModule.sendPasswordResetEmail('user@example.com', 'token');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send password reset email',
        expect.objectContaining({ error: 'Connection refused' }),
      );
    });
  });

  // ─── sendWelcomeEmail ───────────────────────────────

  describe('sendWelcomeEmail', () => {
    it('should include user name in greeting', async () => {
      await emailModule.sendWelcomeEmail('user@example.com', '田中太郎');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('田中太郎さん');
    });

    it('should include WELCOME10 coupon code', async () => {
      await emailModule.sendWelcomeEmail('user@example.com', '田中太郎');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('WELCOME10');
    });

    it('should mention 10% off discount', async () => {
      await emailModule.sendWelcomeEmail('user@example.com', '田中太郎');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('10%OFF');
    });

    it('should include link to pricing page', async () => {
      await emailModule.sendWelcomeEmail('user@example.com', '田中太郎');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('/pricing');
    });

    it('should have appropriate subject line', async () => {
      await emailModule.sendWelcomeEmail('user@example.com', '田中太郎');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain('ようこそ');
      expect(callArgs.subject).toContain('10%OFF');
    });

    it('should escape HTML in user name to prevent XSS', async () => {
      await emailModule.sendWelcomeEmail('user@example.com', '<script>alert("xss")</script>');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).not.toContain('<script>');
      expect(callArgs.html).toContain('&lt;script&gt;');
    });

    it('should return false on Resend API failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Rate limited'));

      const result = await emailModule.sendWelcomeEmail('user@example.com', '田中');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send welcome email',
        expect.objectContaining({ error: 'Rate limited' }),
      );
    });
  });

  // ─── sendOrderConfirmationEmail ─────────────────────

  describe('sendOrderConfirmationEmail', () => {
    const sampleOrder = {
      orderId: 'ORD-001',
      items: [
        { name: 'アクリルスタンド', quantity: 2, price: 4500, productId: 'acrylic-stand' },
        { name: 'キャンバスアート', quantity: 1, price: 6900, productId: 'canvas' },
      ],
      totalAmount: 15900,
      shippingAddress: {
        postalCode: '100-0001',
        prefecture: '東京都',
        city: '千代田区',
        addressLine: '丸の内1-1-1',
        lastName: '山田',
        firstName: '花子',
        email: 'hanako@example.com',
        phone: '090-1234-5678',
      },
    };

    it('should include order ID in HTML and subject', async () => {
      await emailModule.sendOrderConfirmationEmail('user@example.com', sampleOrder);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('ORD-001');
      expect(callArgs.subject).toContain('ORD-001');
    });

    it('should render all line items', async () => {
      await emailModule.sendOrderConfirmationEmail('user@example.com', sampleOrder);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('アクリルスタンド');
      expect(callArgs.html).toContain('キャンバスアート');
    });

    it('should calculate item subtotals correctly', async () => {
      await emailModule.sendOrderConfirmationEmail('user@example.com', sampleOrder);

      const callArgs = mockSend.mock.calls[0][0];
      // 4500 * 2 = 9,000
      expect(callArgs.html).toContain('9,000');
      // 6900 * 1 = 6,900
      expect(callArgs.html).toContain('6,900');
    });

    it('should display total amount', async () => {
      await emailModule.sendOrderConfirmationEmail('user@example.com', sampleOrder);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('15,900');
    });

    it('should include shipping address when provided', async () => {
      await emailModule.sendOrderConfirmationEmail('user@example.com', sampleOrder);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('100-0001');
      expect(callArgs.html).toContain('東京都');
      expect(callArgs.html).toContain('千代田区');
      expect(callArgs.html).toContain('丸の内1-1-1');
      expect(callArgs.html).toContain('山田');
      expect(callArgs.html).toContain('花子');
    });

    it('should not include address block when shipping address is not provided', async () => {
      const orderWithoutAddress = { ...sampleOrder, shippingAddress: undefined };
      await emailModule.sendOrderConfirmationEmail('user@example.com', orderWithoutAddress);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).not.toContain('配送先');
    });

    it('should escape HTML in item names', async () => {
      const xssOrder = {
        orderId: 'ORD-XSS',
        items: [{ name: '<img onerror=alert(1)>', quantity: 1, price: 100, productId: 'xss' }],
        totalAmount: 100,
      };
      await emailModule.sendOrderConfirmationEmail('user@example.com', xssOrder);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).not.toContain('<img onerror');
      expect(callArgs.html).toContain('&lt;img onerror');
    });

    it('should return false on send failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Server error'));

      const result = await emailModule.sendOrderConfirmationEmail('user@example.com', sampleOrder);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send order confirmation email',
        expect.objectContaining({ error: 'Server error' }),
      );
    });
  });

  // ─── sendShippingNotificationEmail ──────────────────

  describe('sendShippingNotificationEmail', () => {
    it('should include order ID in email', async () => {
      await emailModule.sendShippingNotificationEmail('user@example.com', 'ORD-002', '1234567890');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('ORD-002');
    });

    it('should include tracking number', async () => {
      await emailModule.sendShippingNotificationEmail('user@example.com', 'ORD-002', '1234567890');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('1234567890');
    });

    it('should include Japan Post tracking URL', async () => {
      await emailModule.sendShippingNotificationEmail('user@example.com', 'ORD-002', '1234567890');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('trackings.post.japanpost.jp');
      expect(callArgs.html).toContain('requestNo1=1234567890');
    });

    it('should encode special characters in tracking number', async () => {
      await emailModule.sendShippingNotificationEmail('user@example.com', 'ORD-002', 'ABC 123&456');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('requestNo1=ABC%20123%26456');
    });

    it('should have shipping subject line', async () => {
      await emailModule.sendShippingNotificationEmail('user@example.com', 'ORD-002', '1234567890');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain('商品を発送しました');
    });

    it('should return false on send failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Timeout'));

      const result = await emailModule.sendShippingNotificationEmail('user@example.com', 'ORD-002', '123');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send shipping notification email',
        expect.objectContaining({ error: 'Timeout' }),
      );
    });
  });

  // ─── sendReviewRequestEmail ─────────────────────────

  describe('sendReviewRequestEmail', () => {
    it('should include user name in greeting', async () => {
      await emailModule.sendReviewRequestEmail('user@example.com', 'ORD-003', '佐藤一郎');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('佐藤一郎さん');
    });

    it('should include star rating display', async () => {
      await emailModule.sendReviewRequestEmail('user@example.com', 'ORD-003', '佐藤一郎');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('★★★★★');
    });

    it('should include link to account page', async () => {
      await emailModule.sendReviewRequestEmail('user@example.com', 'ORD-003', '佐藤一郎');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('/account');
    });

    it('should include order ID', async () => {
      await emailModule.sendReviewRequestEmail('user@example.com', 'ORD-003', '佐藤一郎');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('ORD-003');
    });

    it('should return false on send failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Connection error'));

      const result = await emailModule.sendReviewRequestEmail('user@example.com', 'ORD-003', '佐藤一郎');

      expect(result).toBe(false);
    });
  });

  // ─── sendCartAbandonmentEmail ───────────────────────

  describe('sendCartAbandonmentEmail', () => {
    const cartItems = [
      { name: 'アクリルスタンド', price: 4500 },
      { name: 'ポストカード', price: 1500 },
    ];

    it('should list all cart items', async () => {
      await emailModule.sendCartAbandonmentEmail('user@example.com', cartItems);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('アクリルスタンド');
      expect(callArgs.html).toContain('ポストカード');
    });

    it('should show prices formatted with locale', async () => {
      await emailModule.sendCartAbandonmentEmail('user@example.com', cartItems);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('4,500');
      expect(callArgs.html).toContain('1,500');
    });

    it('should include link to cart page', async () => {
      await emailModule.sendCartAbandonmentEmail('user@example.com', cartItems);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('/cart');
    });

    it('should have abandonment-themed subject', async () => {
      await emailModule.sendCartAbandonmentEmail('user@example.com', cartItems);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain('お忘れ物');
    });

    it('should return false on send failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('SMTP error'));

      const result = await emailModule.sendCartAbandonmentEmail('user@example.com', cartItems);

      expect(result).toBe(false);
    });
  });

  // ─── Resend not configured ─────────────────────────

  describe('when RESEND_API_KEY is not configured', () => {
    let noKeyModule: Awaited<ReturnType<typeof importEmailModule>>;

    beforeEach(async () => {
      vi.clearAllMocks();
      noKeyModule = await importEmailModule({ RESEND_API_KEY: '' });
    });

    it('sendVerificationEmail should return true and log instead of sending', async () => {
      const result = await noKeyModule.sendVerificationEmail('user@example.com', 'token');

      expect(result).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Resend not configured, verification URL generated',
        expect.objectContaining({ verifyUrl: expect.stringContaining('verify-email') }),
      );
    });

    it('sendPasswordResetEmail should return true and log instead of sending', async () => {
      const result = await noKeyModule.sendPasswordResetEmail('user@example.com', 'token');

      expect(result).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Resend not configured, reset URL generated',
        expect.objectContaining({ resetUrl: expect.stringContaining('reset-password') }),
      );
    });

    it('sendWelcomeEmail should return true and log instead of sending', async () => {
      const result = await noKeyModule.sendWelcomeEmail('user@example.com', '田中');

      expect(result).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Resend not configured, welcome email skipped',
        expect.objectContaining({ to: 'user@example.com' }),
      );
    });

    it('sendOrderConfirmationEmail should return true and log instead of sending', async () => {
      const order = { orderId: 'ORD-001', items: [], totalAmount: 0 };
      const result = await noKeyModule.sendOrderConfirmationEmail('user@example.com', order);

      expect(result).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Resend not configured, order confirmation email skipped',
        expect.objectContaining({ orderId: 'ORD-001' }),
      );
    });

    it('sendShippingNotificationEmail should return true and log instead of sending', async () => {
      const result = await noKeyModule.sendShippingNotificationEmail('user@example.com', 'ORD-002', '123');

      expect(result).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Resend not configured, shipping notification email skipped',
        expect.objectContaining({ orderId: 'ORD-002', trackingNumber: '123' }),
      );
    });

    it('sendReviewRequestEmail should return true and log instead of sending', async () => {
      const result = await noKeyModule.sendReviewRequestEmail('user@example.com', 'ORD-003', '田中');

      expect(result).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('sendCartAbandonmentEmail should return true and log instead of sending', async () => {
      const result = await noKeyModule.sendCartAbandonmentEmail('user@example.com', []);

      expect(result).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  // ─── Error handling edge cases ──────────────────────

  describe('error handling edge cases', () => {
    it('should handle non-Error objects thrown by Resend', async () => {
      mockSend.mockRejectedValueOnce('string error');

      const result = await emailModule.sendVerificationEmail('user@example.com', 'token');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send verification email',
        expect.objectContaining({ error: 'string error' }),
      );
    });

    it('should handle undefined error from Resend', async () => {
      mockSend.mockRejectedValueOnce(undefined);

      const result = await emailModule.sendPasswordResetEmail('user@example.com', 'token');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send password reset email',
        expect.objectContaining({ error: 'undefined' }),
      );
    });

    it('should handle timeout correctly via withTimeout wrapper', async () => {
      // Simulate a send that takes longer than the timeout
      mockSend.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 30_000)),
      );

      const result = await emailModule.sendWelcomeEmail('user@example.com', '田中');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send welcome email',
        expect.objectContaining({ error: 'Email send timeout' }),
      );
    }, 20_000);
  });
});
