import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { Request, Response, Router } from 'express';

// ── Mocks ──────────────────────────────────────────────

vi.mock('../../lib/credits.js', () => ({
  getUserCredits: vi.fn(),
  canGenerate: vi.fn(),
  consumeCredit: vi.fn(),
  initializeUserCredits: vi.fn(),
  isTestUser: vi.fn().mockReturnValue(false),
  registerTestUserIfNeeded: vi.fn(),
}));

vi.mock('../../lib/imageStorage.js', () => ({
  uploadOriginalImage: vi.fn().mockResolvedValue('https://storage.example.com/original.jpg'),
}));

vi.mock('../../lib/watermark.js', () => ({
  applyWatermark: vi.fn().mockResolvedValue(Buffer.from('watermarked')),
  parseBase64DataUrl: vi.fn().mockReturnValue({ buffer: Buffer.from('image'), mimeType: 'image/png' }),
  bufferToDataUrl: vi.fn().mockReturnValue('data:image/png;base64,d2F0ZXJtYXJrZWQ='),
}));

vi.mock('../../lib/galleryState.js', () => ({
  addGalleryItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../lib/stylePrompts.js', () => ({
  styleNameMap: { baroque: 'バロック', renaissance: 'ルネサンス' },
  getStylePrompt: vi.fn().mockReturnValue('Transform into baroque style'),
  getStyleFocusPrompt: vi.fn().mockReturnValue('Focus on dramatic lighting'),
  categoryPrompts: { pets: 'This is a pet photo', family: 'This is a family photo', kids: 'This is a kids photo' },
  validStyleIds: new Set(['baroque', 'renaissance', 'impressionist', 'anime', 'ghibli']),
}));

vi.mock('../../lib/styleAnalytics.js', () => ({
  recordStyleUsage: vi.fn(),
}));

vi.mock('../../lib/metaConversions.js', () => ({
  sendPurchaseEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/mockGeneration.js', () => ({
  generateMockResponse: vi.fn().mockResolvedValue({
    success: true,
    projectId: 'proj_mock_123',
    generatedImage: 'data:image/svg+xml;base64,bW9jaw==',
    thumbnailImage: 'data:image/svg+xml;base64,bW9jaw==',
    watermarked: true,
    creditsUsed: 1,
    creditsRemaining: 4,
  }),
}));

vi.mock('../../config.js', () => ({
  config: {
    GEMINI_API_KEY: 'test-api-key',
    ALLOW_MOCK_GENERATION: 'true',
    NODE_ENV: 'development',
    FRONTEND_URL: 'https://test.com',
    COOKIE_SAME_SITE: 'lax',
  },
}));

vi.mock('../../lib/auth.js', () => ({
  getUserBySessionToken: vi.fn().mockReturnValue(null),
}));

vi.mock('../../lib/requestAuth.js', () => ({
  extractSessionTokenFromHeaders: vi.fn().mockReturnValue(null),
  parseCookies: vi.fn().mockReturnValue(new Map()),
  AUTH_SESSION_COOKIE_NAME: 'fable_session',
  AUTH_CSRF_COOKIE_NAME: 'fable_csrf',
}));

vi.mock('../../middleware/csrfProtection.js', () => ({
  csrfProtection: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function () {
    return {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    };
  }),
}));

vi.mock('multer', () => {
  const multerInstance = {
    single: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
      // The file will be set by the test via mockReq
      next();
    },
  };
  const multerFn = Object.assign(
    () => multerInstance,
    { memoryStorage: () => ({}), MulterError: class MulterError extends Error { code: string; constructor(code: string) { super(code); this.code = code; } } },
  );
  return { default: multerFn };
});

import { generateRouter } from '../../routes/generate.js';
import { getUserCredits, canGenerate, consumeCredit, initializeUserCredits } from '../../lib/credits.js';
import { addGalleryItem } from '../../lib/galleryState.js';
import { uploadOriginalImage } from '../../lib/imageStorage.js';
import { applyWatermark, parseBase64DataUrl, bufferToDataUrl } from '../../lib/watermark.js';
import { generateMockResponse } from '../../lib/mockGeneration.js';
import { parseCookies } from '../../lib/requestAuth.js';
import { config } from '../../config.js';
import { getUserBySessionToken } from '../../lib/auth.js';
import { extractSessionTokenFromHeaders } from '../../lib/requestAuth.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(overrides: Record<string, unknown> = {}): Partial<Request> {
  const defaultFile = {
    fieldname: 'image',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-image-data'),
  };

  return {
    body: {
      styleId: 'baroque',
      category: 'pets',
      ...overrides.body as Record<string, unknown>,
    },
    file: overrides.file !== undefined ? overrides.file : defaultFile,
    headers: {
      cookie: '',
      ...(overrides.headers as Record<string, string> || {}),
    } as Record<string, string>,
    ip: '127.0.0.1',
    requestId: 'test-req-id',
    ...overrides,
  } as Partial<Request>;
}

function mockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  const writeFn = vi.fn();
  const endFn = vi.fn();
  const setHeaderFn = vi.fn();
  const flushHeadersFn = vi.fn();
  const cookieFn = vi.fn();
  const onFn = vi.fn();

  return {
    res: {
      json: jsonFn,
      status: statusFn,
      write: writeFn,
      end: endFn,
      setHeader: setHeaderFn,
      flushHeaders: flushHeadersFn,
      cookie: cookieFn,
      on: onFn,
      writableEnded: false,
      headersSent: false,
    } as unknown as Response,
    statusFn,
    jsonFn,
    writeFn,
    endFn,
    setHeaderFn,
  };
}

// ── Extract handler ────────────────────────────────────

type RouteHandler = (req: Partial<Request>, res: Partial<Response>) => Promise<void>;
let handler: RouteHandler;

beforeAll(() => {
  // The generateRouter registers POST '/' - find the handler
  // Router.stack contains the route layers
  const stack = (generateRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: RouteHandler }> } }> }).stack;
  const postRoute = stack.find(
    (layer) => layer.route?.path === '/' && layer.route?.methods?.post,
  );

  if (!postRoute?.route) {
    throw new Error('Could not find POST / route on generateRouter');
  }

  // The last handler in the stack is the actual route handler (after multer middleware)
  const handlers = postRoute.route.stack;
  handler = handlers[handlers.length - 1].handle;
});

beforeEach(() => {
  vi.clearAllMocks();

  // Reset default mock behaviors
  vi.mocked(canGenerate).mockReturnValue(true);
  vi.mocked(getUserCredits).mockReturnValue({
    userId: 'anon_test-user-id',
    freeRemaining: 2,
    paidRemaining: 0,
    totalUsed: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  vi.mocked(initializeUserCredits).mockReturnValue({
    userId: 'anon_test-user-id',
    freeRemaining: 3,
    paidRemaining: 0,
    totalUsed: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  vi.mocked(consumeCredit).mockReturnValue({
    id: 'txn_test',
    userId: 'anon_test-user-id',
    type: 'consume',
    amount: -1,
    freeAmount: -1,
    paidAmount: 0,
    balanceAfterFree: 1,
    balanceAfterPaid: 0,
    referenceId: 'proj_test',
    description: '無料枠で画像生成',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  vi.mocked(extractSessionTokenFromHeaders).mockReturnValue(null);
  vi.mocked(getUserBySessionToken).mockReturnValue(null);

  // Re-set watermark mocks (clearAllMocks may reset factory-set implementations)
  vi.mocked(parseBase64DataUrl).mockReturnValue({ buffer: Buffer.from('image'), mimeType: 'image/png' });
  vi.mocked(applyWatermark).mockResolvedValue(Buffer.from('watermarked'));
  vi.mocked(bufferToDataUrl).mockReturnValue('data:image/png;base64,d2F0ZXJtYXJrZWQ=');
  vi.mocked(uploadOriginalImage).mockResolvedValue('https://storage.example.com/original.jpg');

  // parseCookies returns consistent anon ID for stable user identity
  vi.mocked(parseCookies).mockReturnValue(new Map([['fable_anon', 'anon_00000000-0000-4000-8000-000000000001']]));

  // Re-set mock generation response (clearAllMocks resets factory implementations)
  vi.mocked(generateMockResponse).mockResolvedValue({
    success: true,
    projectId: 'proj_mock_123',
    generatedImage: 'data:image/svg+xml;base64,bW9jaw==',
    thumbnailImage: 'data:image/svg+xml;base64,bW9jaw==',
    watermarked: true,
    creditsUsed: 1,
    creditsRemaining: 4,
  });

  // Default Gemini success response
  mockGenerateContent.mockResolvedValue({
    response: {
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: 'aW1hZ2VkYXRh', // base64 for "imagedata"
            },
          }],
        },
      }],
    },
  });

  // Ensure config is reset (ALLOW_MOCK_GENERATION is 'true' at module level for allowMockGeneration const)
  (config as Record<string, unknown>).GEMINI_API_KEY = 'test-api-key';
  (config as Record<string, unknown>).ALLOW_MOCK_GENERATION = 'true';
  (config as Record<string, unknown>).NODE_ENV = 'development';
});

// ── Tests ──────────────────────────────────────────────

describe('generate route handler', () => {
  describe('input validation', () => {
    it('returns 400 when image file is missing', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ file: undefined }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_REQUEST' }),
      }));
    });

    it('returns 400 when styleId is missing', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ body: { styleId: '', category: 'pets' } }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_REQUEST' }),
      }));
    });

    it('returns 400 when category is missing', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ body: { styleId: 'baroque', category: '' } }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_REQUEST' }),
      }));
    });

    it('returns 400 when category is invalid', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ body: { styleId: 'baroque', category: 'invalid-category' } }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_CATEGORY' }),
      }));
    });

    it('returns 400 when styleId is not in validStyleIds', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ body: { styleId: 'nonexistent-style', category: 'pets' } }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_STYLE' }),
      }));
    });

    it('returns 400 when options JSON is malformed', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ body: { styleId: 'baroque', category: 'pets', options: '{invalid-json' } }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_OPTIONS' }),
      }));
    });
  });

  describe('credit check', () => {
    it('returns 402 with FREE_TRIAL_EXHAUSTED when anonymous user has no credits', async () => {
      vi.mocked(canGenerate).mockReturnValue(false);

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq(), res);
      expect(statusFn).toHaveBeenCalledWith(402);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FREE_TRIAL_EXHAUSTED' }),
      }));
    });

    it('returns 402 with INSUFFICIENT_CREDITS when authenticated user has no credits', async () => {
      vi.mocked(canGenerate).mockReturnValue(false);
      vi.mocked(extractSessionTokenFromHeaders).mockReturnValue('valid-token');
      vi.mocked(getUserBySessionToken).mockReturnValue({
        id: 'usr_123',
        name: 'Test User',
        email: 'test@example.com',
        authProvider: 'email',
        emailVerified: true,
      });

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq(), res);
      expect(statusFn).toHaveBeenCalledWith(402);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INSUFFICIENT_CREDITS' }),
      }));
    });

    it('initializes credits for new users without balance', async () => {
      vi.mocked(getUserCredits).mockReturnValue(null);

      const { res } = mockRes();
      await handler(mockReq(), res);
      expect(initializeUserCredits).toHaveBeenCalled();
    });
  });

  describe('concurrent request protection', () => {
    it('returns 429 when user already has a generation in progress', async () => {
      // Use a deferred promise so we can resolve later and clean up
      let resolveGeneration!: (value: unknown) => void;
      mockGenerateContent.mockImplementation(
        () => new Promise(resolve => { resolveGeneration = resolve; }),
      );

      const { res: res1 } = mockRes();
      const firstRequest = handler(mockReq(), res1);

      // Give the event loop a tick so inFlightUsers.add() runs
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second request from same user should be rejected
      const { res: res2, statusFn: statusFn2, jsonFn: jsonFn2 } = mockRes();
      await handler(mockReq(), res2);

      expect(statusFn2).toHaveBeenCalledWith(429);
      expect(jsonFn2).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'GENERATION_IN_PROGRESS' }),
      }));

      // Resolve the first request so it completes and cleans up inFlightUsers
      resolveGeneration({
        response: {
          candidates: [{
            content: {
              parts: [{ inlineData: { mimeType: 'image/png', data: 'dGVzdA==' } }],
            },
          }],
        },
      });
      await firstRequest;
    });
  });

  describe('Gemini API call', () => {
    it('successfully generates image and returns proper response', async () => {
      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      // The handler uses streaming response (endWithJson), so check end() was called
      expect(endFn).toHaveBeenCalledTimes(1);
      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.success).toBe(true);
      expect(responseBody.projectId).toMatch(/^proj_/);
      expect(responseBody.generatedImage).toBeDefined();
      expect(responseBody.creditsUsed).toBe(1);
    });

    it('returns error when Gemini returns empty response (no candidates)', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { candidates: [] },
      });
      // Disable mock fallback so error path is tested
      vi.mocked(generateMockResponse).mockRejectedValue(new Error('Mock also failed'));

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      expect(endFn).toHaveBeenCalledTimes(1);
      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('GENERATION_UPSTREAM_FAILED');
    });

    it('returns error when Gemini API throws an error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API_TIMEOUT'));
      // Disable mock fallback so error path is tested
      vi.mocked(generateMockResponse).mockRejectedValue(new Error('Mock also failed'));

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      expect(endFn).toHaveBeenCalledTimes(1);
      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('GENERATION_UPSTREAM_FAILED');
    });

    it('retries with fallback model when primary fails', async () => {
      // First call fails, second succeeds (fallback model)
      mockGenerateContent
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValueOnce({
          response: {
            candidates: [{
              content: {
                parts: [{
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'ZmFsbGJhY2tpbWFnZQ==',
                  },
                }],
              },
            }],
          },
        });

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      expect(endFn).toHaveBeenCalledTimes(1);
      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.success).toBe(true);
    });

    it('passes image data and prompt to Gemini generateContent', async () => {
      const { res } = mockRes();
      await handler(mockReq(), res);

      expect(mockGenerateContent).toHaveBeenCalled();
      const callArgs = mockGenerateContent.mock.calls[0][0];
      // Should include image inline data and text prompt
      expect(callArgs).toHaveLength(2);
      expect(callArgs[0]).toHaveProperty('inlineData');
      expect(callArgs[1]).toHaveProperty('text');
    });
  });

  describe('watermark application', () => {
    it('applies watermark to generated image', async () => {
      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      expect(parseBase64DataUrl).toHaveBeenCalled();
      expect(applyWatermark).toHaveBeenCalled();

      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.watermarked).toBe(true);
    });

    it('returns original image when watermark fails', async () => {
      vi.mocked(applyWatermark).mockResolvedValue(null as unknown as Buffer);

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.watermarked).toBe(false);
    });

    it('returns original image when parseBase64DataUrl fails', async () => {
      vi.mocked(parseBase64DataUrl).mockReturnValue(null);

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.watermarked).toBe(false);
    });
  });

  describe('gallery save', () => {
    it('saves to gallery for authenticated users', async () => {
      vi.mocked(extractSessionTokenFromHeaders).mockReturnValue('valid-token');
      vi.mocked(getUserBySessionToken).mockReturnValue({
        id: 'usr_123',
        name: 'Test User',
        email: 'test@example.com',
        authProvider: 'email',
        emailVerified: true,
      });

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      expect(addGalleryItem).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'usr_123',
        artStyleId: 'baroque',
      }));
      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.gallerySaved).toBe(true);
    });

    it('does not save to gallery for anonymous users', async () => {
      const { res } = mockRes();
      await handler(mockReq(), res);

      expect(addGalleryItem).not.toHaveBeenCalled();
    });

    it('handles gallery save failure gracefully', async () => {
      vi.mocked(extractSessionTokenFromHeaders).mockReturnValue('valid-token');
      vi.mocked(getUserBySessionToken).mockReturnValue({
        id: 'usr_123',
        name: 'Test User',
        email: 'test@example.com',
        authProvider: 'email',
        emailVerified: true,
      });
      vi.mocked(addGalleryItem).mockRejectedValue(new Error('Storage full'));

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.gallerySaved).toBe(false);
      // Image should still be returned even if gallery save fails
      expect(responseBody.success).toBe(true);
    });
  });

  describe('credit consumption', () => {
    it('consumes credit on successful generation', async () => {
      const { res } = mockRes();
      await handler(mockReq(), res);

      expect(consumeCredit).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/^proj_/),
      );
    });

    it('consumes credit in mock fallback path even when mock generation fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));
      vi.mocked(generateMockResponse).mockRejectedValue(new Error('Mock also failed'));

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      // Credit is consumed in the mock fallback path before generateMockResponse is attempted
      expect(consumeCredit).toHaveBeenCalled();
      // But the response is still an error since mock generation also failed
      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.success).toBe(false);
    });

    it('returns creditsRemaining in response', async () => {
      vi.mocked(getUserCredits).mockReturnValue({
        userId: 'anon_test-user-id',
        freeRemaining: 1,
        paidRemaining: 5,
        totalUsed: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.creditsRemaining).toBe(6); // freeRemaining + paidRemaining
    });

    it('still delivers image when credit consumption throws', async () => {
      vi.mocked(consumeCredit).mockImplementation(() => { throw new Error('DB_ERROR'); });

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      // Image should still be delivered
      expect(responseBody.success).toBe(true);
      // creditsRemaining should be 0 as fallback
      expect(responseBody.creditsRemaining).toBe(0);
    });
  });

  describe('mock generation mode', () => {
    it('uses mock generation when ALLOW_MOCK_GENERATION is true and no API key', async () => {
      (config as Record<string, unknown>).GEMINI_API_KEY = '';

      const { res, jsonFn } = mockRes();
      await handler(mockReq(), res);

      expect(generateMockResponse).toHaveBeenCalledWith('baroque');
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        projectId: expect.stringMatching(/^proj_/),
      }));
    });

    it('consumes credit even in mock mode', async () => {
      (config as Record<string, unknown>).GEMINI_API_KEY = '';

      const { res } = mockRes();
      await handler(mockReq(), res);

      expect(consumeCredit).toHaveBeenCalled();
    });

    it('returns 502 when no API key and mock generation fails', async () => {
      (config as Record<string, unknown>).GEMINI_API_KEY = '';
      vi.mocked(generateMockResponse).mockRejectedValue(new Error('Mock failed'));

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq(), res);

      expect(statusFn).toHaveBeenCalledWith(502);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'GENERATION_UPSTREAM_FAILED' }),
      }));
    });

    it('falls back to mock generation when Gemini API fails and mock allowed', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      expect(endFn).toHaveBeenCalledTimes(1);
      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.success).toBe(true);
    });
  });

  describe('original image storage', () => {
    it('uploads original image to storage', async () => {
      const { res } = mockRes();
      await handler(mockReq(), res);

      expect(uploadOriginalImage).toHaveBeenCalledWith(
        expect.any(String), // userId
        expect.stringMatching(/^proj_/), // projectId
        expect.stringMatching(/^data:image\//), // base64 image
      );
    });

    it('continues when original image upload fails', async () => {
      vi.mocked(uploadOriginalImage).mockRejectedValue(new Error('Upload failed'));

      const { res, endFn } = mockRes();
      await handler(mockReq(), res);

      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns 502 for unexpected pre-streaming errors', async () => {
      // Force an error before headers are sent by making getUserCredits throw
      vi.mocked(getUserCredits).mockImplementation(() => { throw new Error('Unexpected error'); });

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq(), res);

      expect(statusFn).toHaveBeenCalledWith(502);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'GENERATION_UPSTREAM_FAILED' }),
      }));
    });

    it('handles valid options JSON with customPrompt', async () => {
      const { res, endFn } = mockRes();
      await handler(mockReq({
        body: { styleId: 'baroque', category: 'pets', options: JSON.stringify({ customPrompt: 'Make it fancy' }) },
      }), res);

      const responseBody = JSON.parse(endFn.mock.calls[0][0] as string);
      expect(responseBody.success).toBe(true);
    });
  });
});
