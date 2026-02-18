import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUserBySessionToken } from '../lib/auth.js';
import { addGalleryItem } from '../lib/galleryState.js';
import { extractSessionTokenFromHeaders, type HeaderMap } from '../lib/requestAuth.js';
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

// Retry configuration for handling 503 errors
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;

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
      const isRetryable = error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 503;

      if (!isRetryable || attempt === retries) {
        throw error;
      }

      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      logger.info(`Attempt ${attempt} failed with 503, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

if (process.env.NODE_ENV === 'production' && (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here')) {
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

const allowMockGeneration = process.env.ALLOW_MOCK_GENERATION === 'true' && process.env.NODE_ENV !== 'production';

generateRouter.post('/', upload.single('image'), async (req: Request, res: Response) => {
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

    // Require authentication
    const sessionToken = extractSessionTokenFromHeaders(req.headers as HeaderMap);
    const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
    if (!sessionUser) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '認証が必要です' }
      });
      return;
    }

    // Prevent concurrent requests from same user (TOCTOU protection)
    // Use local variable for safe cleanup in finally block
    const lockedUserId = sessionUser.id;
    if (inFlightUsers.has(lockedUserId)) {
      res.status(429).json({
        success: false,
        error: { code: 'GENERATION_IN_PROGRESS', message: '画像生成中です。完了後に再度お試しください' }
      });
      return;
    }
    inFlightUsers.add(lockedUserId);

    // Check if user has credits
    let userBalance = getUserCredits(sessionUser.id);
    if (!userBalance) {
      // Initialize credits for new users
      userBalance = initializeUserCredits(sessionUser.id);
    }

    if (!canGenerate(sessionUser.id)) {
      res.status(402).json({
        success: false,
        error: { code: 'INSUFFICIENT_CREDITS', message: 'クレジットが不足しています' }
      });
      return;
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      if (allowMockGeneration) {
        logger.info('No Gemini API key configured, using mock generation', { requestId: req.requestId });

        // Consume credit even in mock mode for realistic testing
        const mockProjectId = `proj_mock_${Date.now()}`;
        let totalRemaining = 0;
        try {
          consumeCredit(sessionUser.id, mockProjectId);
          const updatedBalance = getUserCredits(sessionUser.id);
          totalRemaining = updatedBalance
            ? updatedBalance.freeRemaining + updatedBalance.paidRemaining
            : 0;
        } catch (creditError) {
          logger.warn('Mock generation: credit consumption failed', {
            userId: sessionUser.id,
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

    // Generate image using Gemini 3 Pro Image with retry for 503 errors
    const result = await generateWithRetry(() =>
      model.generateContent([
        {
          inlineData: {
            mimeType: parsedImage.mimeType,
            data: parsedImage.data
          }
        },
        { text: fullPrompt }
      ])
    );

    const response = await result.response;

    // Extract generated image from response
    let generatedImage = '';
    let textResponse = '';

    logger.info('Gemini response received, checking for image', { requestId: req.requestId });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      logger.info('Found parts in response', { count: response.candidates[0].content.parts.length, requestId: req.requestId });

      for (const part of response.candidates[0].content.parts) {
        if ('inlineData' in part && part.inlineData) {
          // Clean base64 data: remove any whitespace/newlines that might corrupt the data URL
          const cleanBase64 = (part.inlineData.data || '').replace(/[\s\n\r]/g, '');
          logger.info('Found image in response', { mimeType: part.inlineData.mimeType, size: cleanBase64.length, requestId: req.requestId });

          // Validate base64 data
          if (cleanBase64.length === 0) {
            logger.error('Empty image data received from Gemini', { requestId: req.requestId });
            continue;
          }

          // Ensure valid base64 characters
          if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
            logger.error('Invalid base64 characters detected', { requestId: req.requestId });
            continue;
          }

          generatedImage = `data:${part.inlineData.mimeType};base64,${cleanBase64}`;
        }
        if ('text' in part && part.text) {
          textResponse = part.text;
          logger.info('Found text response', { preview: textResponse.substring(0, 100), requestId: req.requestId });
        }
      }
    } else {
      logger.info('No candidates or parts in response', { requestId: req.requestId });
      // Log safety feedback for debugging
      const feedback = response.promptFeedback;
      if (feedback) {
        logger.info('Prompt feedback', { feedback, requestId: req.requestId });
      }
      const candidate = response.candidates?.[0];
      if (candidate) {
        logger.info('Candidate details', { finishReason: candidate.finishReason, safetyRatings: candidate.safetyRatings, requestId: req.requestId });
      }
    }

    if (!generatedImage) {
      // Retry once with simplified prompt when Gemini returns no image (often a transient safety filter issue)
      logger.info('No image in first attempt, retrying with simplified prompt', { requestId: req.requestId });
      const retryPrompt = `${stylePrompt}\n\n${categoryPrompt}\n\nTransform this photo into artwork. Keep the subject recognizable. Do not add text or watermarks.`;
      const retryResult = await generateWithRetry(() =>
        model.generateContent([
          {
            inlineData: {
              mimeType: parsedImage.mimeType,
              data: parsedImage.data
            }
          },
          { text: retryPrompt }
        ])
      );

      const retryResponse = await retryResult.response;
      if (retryResponse.candidates?.[0]?.content?.parts) {
        for (const part of retryResponse.candidates[0].content.parts) {
          if ('inlineData' in part && part.inlineData) {
            const cleanBase64 = (part.inlineData.data || '').replace(/[\s\n\r]/g, '');
            if (cleanBase64.length > 0 && /^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
              generatedImage = `data:${part.inlineData.mimeType};base64,${cleanBase64}`;
              logger.info('Retry successful, image generated', { requestId: req.requestId });
            }
          }
          if ('text' in part && part.text) {
            textResponse = part.text;
          }
        }
      } else {
        const retryFeedback = retryResponse.promptFeedback;
        if (retryFeedback) logger.info('Retry prompt feedback', { feedback: retryFeedback, requestId: req.requestId });
      }
    }

    if (!generatedImage) {
      throw new Error(`Gemini returned no image output. Text response: ${textResponse.slice(0, 300)}`);
    }

    logger.info('Image generation successful', { requestId: req.requestId });
    try { recordStyleUsage(styleId, styleNameMap[styleId] || styleId, category); } catch { /* analytics best-effort */ }

    // Generate project ID
    const projectId = `proj_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;

    // Consume 1 credit for successful generation
    let totalRemaining = 0;
    try {
      consumeCredit(sessionUser.id, projectId);
      const updatedBalance = getUserCredits(sessionUser.id);
      totalRemaining = updatedBalance
        ? updatedBalance.freeRemaining + updatedBalance.paidRemaining
        : 0;
    } catch (creditError) {
      // CRITICAL: Credit consumption failed after successful generation
      // Still deliver the image to user - they should not lose their result
      // This requires manual reconciliation
      logger.error('CRITICAL: Credit consumption failed after successful generation', {
        userId: sessionUser.id,
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

    // Auto-save to gallery (sessionUser already authenticated above)
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

    res.json(apiResponse);
  } catch (error) {
    logger.error('Error generating image', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });

    if (allowMockGeneration) {
      try {
        const { styleId } = req.body;
        const mockProjectId = `proj_mock_fallback_${Date.now()}`;

        // Consume credit even in error-fallback mock mode
        let totalRemaining = 0;
        try {
          consumeCredit(sessionUser.id, mockProjectId);
          const balance = getUserCredits(sessionUser.id);
          totalRemaining = balance
            ? balance.freeRemaining + balance.paidRemaining
            : 0;
        } catch (creditError) {
          logger.warn('Error-fallback mock: credit consumption failed', {
            userId: sessionUser.id,
            error: creditError instanceof Error ? creditError.message : String(creditError),
          });
        }

        const mockResponse = await generateMockResponse(styleId || 'baroque');
        mockResponse.creditsRemaining = totalRemaining;
        res.json(mockResponse);
        return;
      } catch {
        // Continue to standard error response
      }
    }

    res.status(502).json({
      success: false,
      error: { code: 'GENERATION_UPSTREAM_FAILED', message: '画像の生成に失敗しました' }
    });
  } finally {
    // Always remove user from in-flight set
    inFlightUsers.delete(lockedUserId);
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
