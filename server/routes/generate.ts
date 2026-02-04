import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateRouter = Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Gemini 2.0 Flash - 画像生成対応モデル
// responseModalities: ['image', 'text'] で画像出力を有効化
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp-image-generation',
  generationConfig: {
    // @ts-expect-error - responseModalities is valid but not in types yet
    responseModalities: ['image', 'text'],
  },
});

interface GenerateImageRequest {
  baseImage: string;
  styleId: string;
  category: 'pets' | 'family' | 'kids';
  options?: {
    gender?: 'masculine' | 'feminine' | 'neutral';
    customPrompt?: string;
  };
}

interface GenerateImageResponse {
  success: boolean;
  projectId: string;
  generatedImage: string;
  thumbnailImage: string;
  watermarked: boolean;
  creditsUsed: number;
  creditsRemaining: number;
}

// Style prompts for each art style
const stylePrompts: Record<string, string> = {
  'intelligent': 'Transform this image into a beautiful classical portrait, automatically selecting the best artistic style',
  'baroque-red': 'Transform this image into a luxurious Baroque portrait with deep red velvet drapes, ornate golden frame, dramatic chiaroscuro lighting, in the style of Rubens and Velázquez',
  'florentine-renaissance': 'Transform this image into a Florentine Renaissance portrait with refined brushwork, classical composition, warm earthy tones, in the style of Leonardo da Vinci and Raphael',
  'renaissance-sky': 'Transform this image into a Renaissance portrait with dramatic sky background, atmospheric perspective, golden hour lighting, masterful technique of Italian Renaissance masters',
  'rococo': 'Transform this image into a Rococo style portrait with pastel colors, playful elegance, elaborate decorative elements, flowing curves, in the style of Boucher and Fragonard',
  'dutch-golden': 'Transform this image into a Dutch Golden Age portrait with rich chiaroscuro, warm candlelight, intimate atmosphere, in the style of Rembrandt and Vermeer',
  'venetian': 'Transform this image into a Venetian Renaissance portrait with warm glowing colors, sensuous brushwork, luxurious fabrics, in the style of Titian and Giorgione',
  'neoclassical': 'Transform this image into a Neoclassical portrait with elegant simplicity, idealized beauty, Greek and Roman inspired aesthetics, in the style of Jacques-Louis David',
  'watercolor': 'Transform this image into a delicate Japanese watercolor painting with soft brushstrokes, subtle gradients, traditional wash techniques, ethereal and poetic atmosphere',
  'anime': 'Transform this image into a vibrant Japanese anime illustration with bold colors, expressive eyes, dynamic composition, clean cel-shaded style',
  'japanese-modern': 'Transform this image into a Japanese modern art style, blending traditional aesthetics with contemporary design, minimalist composition with bold accents',
  'ukiyo-e': 'Transform this image into a traditional Ukiyo-e woodblock print style with bold outlines, flat colors, dramatic compositions, in the style of Hokusai and Hiroshige'
};

// Category-specific prompt additions
const categoryPrompts: Record<string, string> = {
  'pets': 'The subject is a beloved pet, capture their personality and charm with dignity and elegance',
  'family': 'The subject is a family member, capture their warmth and character with timeless elegance',
  'kids': 'The subject is a child, capture their innocence and joy with gentle, warm artistry'
};

generateRouter.post('/', async (req: Request<object, object, GenerateImageRequest>, res: Response) => {
  try {
    const { baseImage, styleId, category, options } = req.body;

    if (!baseImage || !styleId || !category) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Missing required fields' }
      });
      return;
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      // Fall back to mock generation if no API key
      console.log('No Gemini API key configured, using mock generation');
      const response = await generateMockResponse(styleId);
      res.json(response);
      return;
    }

    // Build the prompt
    const stylePrompt = stylePrompts[styleId] || stylePrompts['intelligent'];
    const categoryPrompt = categoryPrompts[category] || '';
    const customPrompt = options?.customPrompt || '';

    const fullPrompt = `${stylePrompt}. ${categoryPrompt}. ${customPrompt}.
Create a high-quality artistic portrait that maintains the subject's likeness while applying the specified artistic style.
The result should be suitable for framing and display.`;

    // Extract base64 image data
    const base64Data = baseImage.replace(/^data:image\/\w+;base64,/, '');

    console.log('Generating image with Gemini 2.0 Flash...', { styleId, category });

    // Generate image using Gemini 2.0 Flash with image generation
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      },
      { text: fullPrompt }
    ]);

    const response = await result.response;

    // Extract generated image from response
    let generatedImage = '';
    let textResponse = '';

    console.log('Gemini response received, checking for image...');

    if (response.candidates && response.candidates[0]?.content?.parts) {
      console.log(`Found ${response.candidates[0].content.parts.length} parts in response`);

      for (const part of response.candidates[0].content.parts) {
        if ('inlineData' in part && part.inlineData) {
          console.log(`Found image: ${part.inlineData.mimeType}, size: ${part.inlineData.data?.length || 0} bytes`);
          generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        if ('text' in part && part.text) {
          textResponse = part.text;
          console.log(`Found text response: ${textResponse.substring(0, 100)}...`);
        }
      }
    } else {
      console.log('No candidates or parts in response');
    }

    if (!generatedImage) {
      // If no image in response, fall back to mock
      console.log('No image in Gemini response, using mock. Text response:', textResponse);
      const mockResponse = await generateMockResponse(styleId);
      res.json(mockResponse);
      return;
    }

    console.log('Image generation successful!');

    // Generate project ID
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const apiResponse: GenerateImageResponse = {
      success: true,
      projectId,
      generatedImage,
      thumbnailImage: generatedImage,
      watermarked: false,
      creditsUsed: 1,
      creditsRemaining: 4
    };

    res.json(apiResponse);
  } catch (error) {
    console.error('Error generating image:', error);

    // Fall back to mock on error
    try {
      const { styleId } = req.body;
      const mockResponse = await generateMockResponse(styleId || 'intelligent');
      res.json(mockResponse);
    } catch {
      res.status(500).json({
        success: false,
        error: { code: 'GENERATION_FAILED', message: 'Failed to generate image' }
      });
    }
  }
});

// Mock response generator (fallback when API is not available)
async function generateMockResponse(styleId: string): Promise<GenerateImageResponse> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const mockImage = generateMockPortrait(styleId);

  return {
    success: true,
    projectId,
    generatedImage: mockImage,
    thumbnailImage: mockImage,
    watermarked: true,
    creditsUsed: 1,
    creditsRemaining: 4
  };
}

// Generate a mock portrait SVG based on style
function generateMockPortrait(styleId: string): string {
  const safeStyleId = styleId.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
  const colors = getStyleColors(styleId);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.bg1}"/>
          <stop offset="100%" style="stop-color:${colors.bg2}"/>
        </linearGradient>
        <radialGradient id="frame" cx="50%" cy="50%" r="50%">
          <stop offset="70%" style="stop-color:${colors.frame1}"/>
          <stop offset="100%" style="stop-color:${colors.frame2}"/>
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill="url(#bg)"/>
      <rect x="20" y="20" width="360" height="460" rx="10" fill="url(#frame)" opacity="0.3"/>
      <ellipse cx="200" cy="220" rx="100" ry="120" fill="${colors.accent}" opacity="0.5"/>
      <text x="200" y="420" font-family="serif" font-size="24" fill="${colors.text}" text-anchor="middle" font-style="italic">
        Renaissance Portrait
      </text>
      <text x="200" y="450" font-family="sans-serif" font-size="14" fill="${colors.text}" text-anchor="middle" opacity="0.7">
        Style: ${safeStyleId}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function getStyleColors(styleId: string): Record<string, string> {
  const styles: Record<string, Record<string, string>> = {
    'baroque-red': { bg1: '#2F1810', bg2: '#1a0d08', frame1: '#DAA520', frame2: '#8B4513', accent: '#8B0000', text: '#F5DEB3' },
    'florentine-renaissance': { bg1: '#2F2F2F', bg2: '#1a1a1a', frame1: '#D2691E', frame2: '#8B4513', accent: '#8B4513', text: '#F5F5DC' },
    'renaissance-sky': { bg1: '#2F4F4F', bg2: '#1a2f2f', frame1: '#87CEEB', frame2: '#4682B4', accent: '#4682B4', text: '#F0E68C' },
    'rococo': { bg1: '#1a1a2e', bg2: '#0f0f1a', frame1: '#FFD700', frame2: '#4169E1', accent: '#DC143C', text: '#FFFFFF' },
    'dutch-golden': { bg1: '#1C1C1C', bg2: '#0a0a0a', frame1: '#DAA520', frame2: '#3D2314', accent: '#8B7355', text: '#F5DEB3' },
    'watercolor': { bg1: '#E8F4F8', bg2: '#B8D4E3', frame1: '#7FB3D5', frame2: '#2E86AB', accent: '#2E86AB', text: '#1a3a5c' },
    'anime': { bg1: '#FF6B9D', bg2: '#C44569', frame1: '#F8B500', frame2: '#00D9FF', accent: '#FF6B9D', text: '#FFFFFF' },
    'japanese-modern': { bg1: '#2D3436', bg2: '#1a1a1a', frame1: '#D4A373', frame2: '#E07A5F', accent: '#D4A373', text: '#DFE6E9' },
    'ukiyo-e': { bg1: '#1A3A5C', bg2: '#0f1f30', frame1: '#C9B037', frame2: '#E8D5B7', accent: '#C9B037', text: '#E8D5B7' },
    'default': { bg1: '#262626', bg2: '#1a1a1a', frame1: '#1ABC9C', frame2: '#16a085', accent: '#1ABC9C', text: '#FFFFFF' }
  };

  return styles[styleId] || styles['default'];
}
