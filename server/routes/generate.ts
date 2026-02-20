import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { getUserBySessionToken } from '../lib/auth.js';
import { addGalleryItem } from '../lib/galleryState.js';
import { extractSessionTokenFromHeaders, parseCookies, type HeaderMap } from '../lib/requestAuth.js';
import { csrfProtection } from '../middleware/csrfProtection.js';
import { logger } from '../lib/logger.js';
import { recordStyleUsage } from '../lib/styleAnalytics.js';
import { styleNameMap, getStylePrompt, getStyleFocusPrompt, categoryPrompts, validStyleIds } from '../lib/stylePrompts.js';
import { generateMockResponse, type GenerateImageResponse } from '../lib/mockGeneration.js';
import {
  getUserCredits,
  canGenerate,
  consumeCredit,
  initializeUserCredits,
  isTestUser,
  registerTestUserIfNeeded,
} from '../lib/credits.js';

export const generateRouter = Router();
generateRouter.use(csrfProtection());

// CRITICAL-2 FIX: Race Condition Protection Design Documentation
//
// Problem: Time-of-Check-Time-of-Use (TOCTOU) Race Condition
// Without protection, concurrent requests from the same user could both pass the credit check
// and consume credits twice, even if the user only had 1 credit remaining.
//
// Attack Scenario:
// 1. User has 1 credit remaining
// 2. User sends 2 concurrent /generate requests (Request A and Request B)
// 3. Request A checks credits → 1 remaining → OK
// 4. Request B checks credits → 1 remaining → OK (race window)
// 5. Request A generates image → consumes 1 credit → 0 remaining
// 6. Request B generates image → tries to consume credit → FAILS (but image already generated)
//
// Solution: In-Flight User Locking
// Track active generation requests per user using a Set<userId>.
// If a user already has a generation in progress, reject new requests with 429.
//
// Design Properties:
// - Simple: No database locks, no distributed coordination needed
// - Fast: O(1) lookup and cleanup
// - Safe: Prevents double-spending even under high concurrency
// - User-friendly: Clear error message for concurrent requests
//
// Trade-offs:
// - Single-server only (Railway restart clears locks, but that's acceptable)
// - No queuing (user must retry manually, but this is simpler)
// - Coarse-grained (locks entire user, not per-project, but generation is fast)
//
// Cleanup: finally block ensures lock is released even on errors
const inFlightUsers = new Set<string>();

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);

class FileTypeError extends Error {
  constructor() {
    super('Only image files are accepted');
    this.name = 'FileTypeError';
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5, fieldSize: 2048 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new FileTypeError());
  },
});

// Retry configuration for handling transient API errors
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const status = error instanceof Error && 'status' in error
        ? (error as { status: number }).status
        : 0;
      const isRetryable = RETRYABLE_STATUS_CODES.has(status);

      if (!isRetryable || attempt === retries) {
        throw error;
      }

      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      logger.info(`Attempt ${attempt} failed with ${status}, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}

// Extract image from Gemini response parts. Returns { image, text } or null values.
interface GeminiExtractResult { image: string; text: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Gemini SDK types are complex; runtime checks handle safety
function extractImageFromResponse(response: any, requestId: string | undefined): GeminiExtractResult {
  let image = '';
  let text = '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Gemini SDK response has dynamic structure
  const parts = response.candidates?.[0]?.content?.parts as Array<Record<string, any>> | undefined;
  if (parts && parts.length > 0) {
    logger.info('Found parts in response', { count: parts.length, requestId });

    for (const part of parts) {
      if ('inlineData' in part && part.inlineData) {
        const cleanBase64 = (part.inlineData.data || '').replace(/[\s\n\r]/g, '');
        logger.info('Found image in response', { mimeType: part.inlineData.mimeType, size: cleanBase64.length, requestId });

        if (cleanBase64.length === 0) {
          logger.warn('Empty image data received from Gemini', { requestId });
          continue;
        }
        if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
          logger.warn('Invalid base64 characters detected', { requestId });
          continue;
        }
        image = `data:${part.inlineData.mimeType};base64,${cleanBase64}`;
        break; // Use first valid image
      }
      if ('text' in part && part.text) {
        text = part.text;
        logger.info('Found text response', { preview: text.substring(0, 100), requestId });
      }
    }
  } else {
    // Log full diagnostic info for empty responses
    const candidate = response.candidates?.[0];
    const feedback = response.promptFeedback;
    logger.warn('No candidates or parts in response', {
      requestId,
      hasCandidates: !!response.candidates,
      candidateCount: response.candidates?.length ?? 0,
      finishReason: candidate?.finishReason ?? 'N/A',
      safetyRatings: candidate?.safetyRatings ?? 'N/A',
      promptFeedback: feedback ?? 'N/A',
      contentKeys: candidate?.content ? Object.keys(candidate.content) : [],
    });
  }

  return { image, text };
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY || '');

if (config.NODE_ENV === 'production' && (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_api_key_here')) {
  logger.warn('GEMINI_API_KEY is not configured in production');
}

// Gemini 3 Pro Image - 画像生成対応の最新モデル
// responseModalities: ['image', 'text'] で画像出力を有効化
const model = genAI.getGenerativeModel(
  {
    model: 'gemini-3-pro-image-preview',
    generationConfig: {
      // @ts-expect-error - responseModalities is valid but not in types yet
      responseModalities: ['image', 'text'],
    },
  },
  { timeout: 90_000 },
);

// フォールバックモデル: プライマリが503の場合にステージ3で使用
const fallbackModel = genAI.getGenerativeModel(
  {
    model: 'gemini-2.5-flash-image',
    generationConfig: {
      // @ts-expect-error - responseModalities is valid but not in types yet
      responseModalities: ['image', 'text'],
    },
  },
  { timeout: 90_000 },
);

const allowMockGeneration = config.ALLOW_MOCK_GENERATION === 'true' && config.NODE_ENV !== 'production';

// Anonymous user support: cookie-based ID for free trial tracking
const ANON_COOKIE_NAME = 'fable_anon';
const isProduction = process.env.NODE_ENV === 'production';

const ANON_ID_PATTERN = /^anon_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getOrCreateAnonId(req: Request, res: Response): string {
  const cookieHeader = typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined;
  const cookies = parseCookies(cookieHeader);
  const existing = cookies.get(ANON_COOKIE_NAME);
  if (existing && (ANON_ID_PATTERN.test(existing) || isTestUser(existing))) return existing;

  const anonId = `anon_${crypto.randomUUID()}`;
  res.cookie(ANON_COOKIE_NAME, anonId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction && config.COOKIE_SAME_SITE === 'none' ? 'none' as const : 'lax' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
  return anonId;
}

generateRouter.post('/', upload.single('image'), async (req: Request, res: Response) => {
  let userId = '';
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  try {
    const styleId = typeof req.body.styleId === 'string' ? req.body.styleId : '';
    const category = typeof req.body.category === 'string' ? req.body.category : '';

    let options: { customPrompt?: string } | undefined;
    try {
      options = req.body.options ? JSON.parse(req.body.options) : undefined;
    } catch {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_OPTIONS', message: 'オプションの形式が不正です' }
      });
      return;
    }

    if (!req.file || !styleId || !category) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '必須項目が不足しています' }
      });
      return;
    }

    const validCategories = ['pets', 'family', 'kids'];
    if (!validCategories.includes(category)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: '不正なカテゴリです' }
      });
      return;
    }

    if (!validStyleIds.has(styleId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STYLE', message: '不正なスタイルIDです' }
      });
      return;
    }

    // Resolve user: authenticated or anonymous (cookie-based)
    const sessionToken = extractSessionTokenFromHeaders(req.headers as HeaderMap);
    const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
    userId = sessionUser ? sessionUser.id : getOrCreateAnonId(req, res);

    // Register authenticated test user by email (adds to testUserIds dynamically)
    if (sessionUser) {
      registerTestUserIfNeeded(sessionUser.id, sessionUser.email);
    }

    // Prevent concurrent requests from same user (TOCTOU protection)
    if (inFlightUsers.has(userId)) {
      res.status(429).json({
        success: false,
        error: { code: 'GENERATION_IN_PROGRESS', message: '画像生成中です。完了後に再度お試しください' }
      });
      return;
    }
    inFlightUsers.add(userId);

    // Check if user has credits
    let userBalance = getUserCredits(userId);
    if (!userBalance) {
      // Initialize credits for new users
      userBalance = initializeUserCredits(userId);
    }

    if (!canGenerate(userId)) {
      if (!sessionUser) {
        res.status(402).json({
          success: false,
          error: { code: 'FREE_TRIAL_EXHAUSTED', message: '無料お試し（3回）が終了しました。ログインして続けましょう' }
        });
      } else {
        res.status(402).json({
          success: false,
          error: { code: 'INSUFFICIENT_CREDITS', message: 'クレジットが不足しています' }
        });
      }
      return;
    }

    // Check if API key is configured
    if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_api_key_here') {
      if (allowMockGeneration) {
        logger.info('No Gemini API key configured, using mock generation', { requestId: req.requestId });

        // Consume credit even in mock mode for realistic testing
        const mockProjectId = `proj_mock_${Date.now()}`;
        let totalRemaining = 0;
        try {
          consumeCredit(userId, mockProjectId);
          const updatedBalance = getUserCredits(userId);
          totalRemaining = updatedBalance
            ? updatedBalance.freeRemaining + updatedBalance.paidRemaining
            : 0;
        } catch (creditError) {
          logger.warn('Mock generation: credit consumption failed', {
            userId: userId,
            error: creditError instanceof Error ? creditError.message : String(creditError),
          });
        }

        const response = await generateMockResponse(styleId);
        response.creditsRemaining = totalRemaining;
        res.json(response);
        return;
      }

      res.status(500).json({
        success: false,
        error: { code: 'SERVICE_NOT_CONFIGURED', message: '画像生成サービスが設定されていません' }
      });
      return;
    }

    // Build the prompt using dynamic style selection
    const stylePrompt = getStylePrompt(styleId, category);
    const styleFocusPrompt = getStyleFocusPrompt(styleId);
    const categoryPrompt = categoryPrompts[category] || '';
    const rawCustomPrompt = typeof options?.customPrompt === 'string' ? options.customPrompt : '';
    const customPrompt = rawCustomPrompt
      .normalize('NFC')
      // eslint-disable-next-line no-control-regex -- intentional removal of control characters from user input
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim()
      .slice(0, 500);

    const fullPrompt = `${stylePrompt}

${styleFocusPrompt}

${categoryPrompt}

${customPrompt}

CRITICAL REQUIREMENTS:
- PORTRAIT COMPOSITION: This is a portrait art service. Keep the subject centered and prominently featured. Maintain the original face/head position and expression.
- ARTISTIC TRANSFORMATION: Apply the style STRONGLY. The result must look like genuine artwork, NOT a photo filter or overlay.
- SUBJECT FIDELITY: The subject must remain clearly recognizable. Stylization is allowed, but identity cues must stay intact.
- ARTISTIC QUALITY: Render with visible artistic techniques appropriate to the style (brushstrokes, textures, line work, etc.)
- BACKGROUND: Create an appropriate artistic background that complements the chosen style. Do NOT keep the original photo background.
- AVOID: Do not produce photorealistic results. Do not add text or watermarks. Do not crop or change the framing significantly.`;

    // Extract image data from uploaded file (multer handles size validation)
    const parsedImage = {
      mimeType: req.file.mimetype,
      data: req.file.buffer.toString('base64'),
    };

    logger.info('Generating image with Gemini 3 Pro Image', { styleId, category, requestId: req.requestId });

    // --- Keep-alive streaming response ---
    // Gemini API calls take 30-90+ seconds. Without data flowing, browsers and
    // intermediate proxies (Railway Edge, corporate firewalls) drop idle TCP
    // connections, causing "Failed to fetch" on the client.
    //
    // Solution: Start a chunked response and send periodic space characters.
    // JSON.parse ignores leading whitespace, so the client's response.json()
    // still works correctly. Status code is always 200 since headers are sent
    // before Gemini completes — the client checks `data.success` instead.
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    keepAliveTimer = setInterval(() => {
      if (!res.writableEnded) res.write(' ');
    }, 5_000);

    // Helper to end the keep-alive response with JSON
    const endWithJson = (body: object) => {
      if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null; }
      if (!res.writableEnded) res.end(JSON.stringify(body));
    };

    try {
    // --- Image generation with empty-response resilience ---
    // Gemini may return HTTP 200 with empty content when the model is transiently
    // unavailable. We retry with escalating prompt simplification and backoff.
    // Total API calls bounded: stage 1 gets full HTTP retries, stages 2-3 get
    // single attempt only. Maximum: 3 + 1 + 1 = 5 API calls.
    let clientDisconnected = false;
    res.on('close', () => { clientDisconnected = true; });

    const imageContent = {
      inlineData: { mimeType: parsedImage.mimeType, data: parsedImage.data },
    };
    const retryStages = [
      { prompt: fullPrompt, delay: 0, label: 'full' as const, httpRetries: MAX_RETRIES, useFallback: false },
      // Stage 2: simplified prompt (often bypasses transient safety filters), single HTTP attempt
      { prompt: `${stylePrompt}\n\n${categoryPrompt}\n\nTransform this photo into artwork. Keep the subject recognizable. Do not add text or watermarks.`, delay: 5000, label: 'simplified' as const, httpRetries: 1, useFallback: false },
      // Stage 3: minimal prompt as last resort with fallback model, single HTTP attempt
      { prompt: 'Transform this photo into a classical painting. Keep the subject recognizable.', delay: 15000, label: 'minimal' as const, httpRetries: 1, useFallback: true },
    ];

    let generatedImage = '';
    let textResponse = '';

    for (let attempt = 0; attempt < retryStages.length; attempt++) {
      const stage = retryStages[attempt];

      if (clientDisconnected) {
        logger.info('Client disconnected, aborting generation', { requestId: req.requestId });
        break;
      }

      if (stage.delay > 0) {
        logger.info(`Waiting ${stage.delay}ms before retry attempt ${attempt + 1}`, { requestId: req.requestId });
        await sleep(stage.delay);
      }

      logger.info(`Generating image (attempt ${attempt + 1}/${retryStages.length}, prompt: ${stage.label})`, {
        requestId: req.requestId,
      });

      try {
        const activeModel = stage.useFallback ? fallbackModel : model;
        if (stage.useFallback) {
          logger.info('Using fallback model (gemini-2.5-flash-image)', { requestId: req.requestId });
        }
        const result = await generateWithRetry(
          () => activeModel.generateContent([imageContent, { text: stage.prompt }]),
          stage.httpRetries,
        );

        const response = await result.response;
        const extracted = extractImageFromResponse(response, req.requestId);
        textResponse = extracted.text || textResponse;

        if (extracted.image) {
          generatedImage = extracted.image;
          if (attempt > 0) {
            logger.info(`Retry attempt ${attempt + 1} succeeded (prompt: ${stage.label})`, { requestId: req.requestId });
          }
          break;
        }

        logger.warn(`Attempt ${attempt + 1} returned no image`, { requestId: req.requestId, prompt: stage.label });
      } catch (stageError) {
        logger.warn(`Stage ${stage.label} failed, ${attempt < retryStages.length - 1 ? 'trying next stage' : 'no more stages'}`, {
          requestId: req.requestId,
          error: stageError instanceof Error ? stageError.message : String(stageError),
        });
      }
    }

    if (!generatedImage) {
      throw new Error(`Gemini returned no image after ${retryStages.length} attempts. Text: ${textResponse.slice(0, 300)}`);
    }

    logger.info('Image generation successful', { requestId: req.requestId });
    try { recordStyleUsage(styleId, styleNameMap[styleId] || styleId, category); } catch { /* analytics best-effort */ }

    // Generate project ID
    const projectId = `proj_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;

    // Consume 1 credit for successful generation
    let totalRemaining = 0;
    try {
      consumeCredit(userId, projectId);
      const updatedBalance = getUserCredits(userId);
      totalRemaining = updatedBalance
        ? updatedBalance.freeRemaining + updatedBalance.paidRemaining
        : 0;
    } catch (creditError) {
      // CRITICAL: Credit consumption failed after successful generation
      // Still deliver the image to user - they should not lose their result
      // This requires manual reconciliation
      logger.error('CRITICAL: Credit consumption failed after successful generation', {
        userId: userId,
        projectId,
        error: creditError instanceof Error ? creditError.message : String(creditError),
        requestId: req.requestId,
      });
      // Return 0 remaining to indicate the issue - user should contact support
    }

    const apiResponse: GenerateImageResponse = {
      success: true,
      projectId,
      generatedImage,
      thumbnailImage: generatedImage,
      watermarked: false,
      creditsUsed: 1,
      creditsRemaining: totalRemaining
    };

    // Auto-save to gallery (authenticated users only)
    if (sessionUser) {
      try {
        await addGalleryItem({
          userId: sessionUser.id,
          imageDataUrl: generatedImage,
          thumbnailDataUrl: generatedImage,
          artStyleId: styleId,
          artStyleName: styleNameMap[styleId] || styleId,
        });
        apiResponse.gallerySaved = true;
      } catch (err) {
        logger.error('Failed to save to gallery', { error: err instanceof Error ? err.message : String(err), requestId: req.requestId });
        apiResponse.gallerySaved = false;
      }
    }

    endWithJson(apiResponse);

    } catch (geminiError) {
      // Handle Gemini-specific errors within the keep-alive block
      logger.error('Error generating image (streaming)', {
        error: geminiError instanceof Error ? geminiError.message : String(geminiError),
        requestId: req.requestId,
      });

      if (allowMockGeneration) {
        try {
          const mockProjectId = `proj_mock_fallback_${Date.now()}`;
          let totalRemaining = 0;
          try {
            consumeCredit(userId, mockProjectId);
            const balance = getUserCredits(userId);
            totalRemaining = balance
              ? balance.freeRemaining + balance.paidRemaining
              : 0;
          } catch (creditError) {
            logger.warn('Error-fallback mock: credit consumption failed', {
              userId: userId,
              error: creditError instanceof Error ? creditError.message : String(creditError),
            });
          }
          const mockResponse = await generateMockResponse(styleId || 'baroque');
          mockResponse.creditsRemaining = totalRemaining;
          endWithJson(mockResponse);
          return;
        } catch {
          // Continue to standard error response
        }
      }

      endWithJson({
        success: false,
        error: { code: 'GENERATION_UPSTREAM_FAILED', message: '画像の生成に失敗しました' },
      });
    }

  } catch (error) {
    // Pre-Gemini errors (validation passed but headers not yet flushed is impossible here,
    // so this only fires for truly unexpected errors before the streaming block)
    logger.error('Error generating image', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });

    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: { code: 'GENERATION_UPSTREAM_FAILED', message: '画像の生成に失敗しました' }
      });
    }
  } finally {
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    // Always remove user from in-flight set (userId may be '' if validation failed early)
    if (userId) inFlightUsers.delete(userId);
  }
});

// Multer error handling middleware
generateRouter.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: { code: 'IMAGE_TOO_LARGE', message: '画像サイズが大きすぎます（最大10MB）' }
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: err.message }
    });
    return;
  }
  if (err instanceof FileTypeError) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_FILE_TYPE', message: '画像ファイルのみアップロード可能です' }
    });
    return;
  }
  next(err);
});
