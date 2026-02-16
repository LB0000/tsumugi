export interface GenerateImageResponse {
  success: boolean;
  projectId: string;
  generatedImage: string;
  thumbnailImage: string;
  watermarked: boolean;
  creditsUsed: number;
  creditsRemaining: number;
  gallerySaved?: boolean;
}

export async function generateMockResponse(styleId: string): Promise<GenerateImageResponse> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const projectId = `proj_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;
  const mockImage = generateMockPortrait(styleId);

  return {
    success: true,
    projectId,
    generatedImage: mockImage,
    thumbnailImage: mockImage,
    watermarked: true,
    creditsUsed: 1,
    creditsRemaining: 4,
  };
}

function generateMockPortrait(styleId: string): string {
  const safeStyleId = styleId.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
  const colors = getStyleColors(styleId);
  const title = getMockPortraitTitle(styleId);

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
        ${title}
      </text>
      <text x="200" y="450" font-family="sans-serif" font-size="14" fill="${colors.text}" text-anchor="middle" opacity="0.7">
        Style: ${safeStyleId}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function getMockPortraitTitle(styleId: string): string {
  const titles: Record<string, string> = {
    'ghibli': 'Nostalgic Animation Portrait',
    'anime': 'Anime Portrait',
    'watercolor': 'Watercolor Portrait',
    'ukiyo-e': 'Ukiyo-e Portrait',
    'sumi-e': 'Ink Wash Portrait',
    'baroque': 'Baroque Portrait',
    'renaissance': 'Renaissance Portrait',
    'impressionist': 'Impressionist Portrait',
    'pop-art': 'Pop Art Portrait',
  };

  return titles[styleId] || 'Stylized Portrait';
}

function getStyleColors(styleId: string): Record<string, string> {
  const styles: Record<string, Record<string, string>> = {
    'baroque': { bg1: '#2F1810', bg2: '#1a0d08', frame1: '#DAA520', frame2: '#8B4513', accent: '#8B0000', text: '#F5DEB3' },
    'renaissance': { bg1: '#2F2F2F', bg2: '#1a1a1a', frame1: '#D2691E', frame2: '#8B4513', accent: '#8B4513', text: '#F5F5DC' },
    'impressionist': { bg1: '#E8F0FE', bg2: '#C5D5EA', frame1: '#87CEEB', frame2: '#DDA0DD', accent: '#F0E68C', text: '#2F4F4F' },
    'watercolor': { bg1: '#E8F4F8', bg2: '#B8D4E3', frame1: '#7FB3D5', frame2: '#2E86AB', accent: '#2E86AB', text: '#1a3a5c' },
    'ukiyo-e': { bg1: '#1A3A5C', bg2: '#0f1f30', frame1: '#C9B037', frame2: '#E8D5B7', accent: '#C9B037', text: '#E8D5B7' },
    'sumi-e': { bg1: '#F5F5F5', bg2: '#D3D3D3', frame1: '#2C2C2C', frame2: '#696969', accent: '#2C2C2C', text: '#1a1a1a' },
    'anime': { bg1: '#FF6B9D', bg2: '#C44569', frame1: '#F8B500', frame2: '#00D9FF', accent: '#FF6B9D', text: '#FFFFFF' },
    'ghibli': { bg1: '#E8F5E9', bg2: '#A5D6A7', frame1: '#4CAF50', frame2: '#FF9800', accent: '#87CEEB', text: '#2E7D32' },
    'pop-art': { bg1: '#FF1493', bg2: '#FF4500', frame1: '#FFD700', frame2: '#00CED1', accent: '#FF1493', text: '#FFFFFF' },
    'hand-drawn': { bg1: '#ECF0F1', bg2: '#BDC3C7', frame1: '#2C3E50', frame2: '#7F8C8D', accent: '#2C3E50', text: '#1a1a1a' },
    'stained-glass': { bg1: '#1a1a2e', bg2: '#0a0a1a', frame1: '#E74C3C', frame2: '#3498DB', accent: '#F39C12', text: '#E8D5B7' },
    'art-nouveau': { bg1: '#5D4E37', bg2: '#3d3224', frame1: '#C9A96E', frame2: '#8B6914', accent: '#C9A96E', text: '#E8D5B7' },
    'pixel-art': { bg1: '#1a1a2e', bg2: '#16213e', frame1: '#4ECDC4', frame2: '#FF6B6B', accent: '#45B7D1', text: '#96CEB4' },
    'vector': { bg1: '#6C5CE7', bg2: '#4834d4', frame1: '#00CECE', frame2: '#FD79A8', accent: '#FDCB6E', text: '#FFFFFF' },
    'pet-royalty': { bg1: '#4B0082', bg2: '#2d004d', frame1: '#DAA520', frame2: '#722F37', accent: '#DAA520', text: '#FFFACD' },
    'pet-samurai': { bg1: '#2C2C2C', bg2: '#1a1a1a', frame1: '#C9B037', frame2: '#8B0000', accent: '#C9B037', text: '#E8D5B7' },
    'pet-fairy': { bg1: '#E6E6FA', bg2: '#D8BFD8', frame1: '#FFB6C1', frame2: '#98FB98', accent: '#FFD700', text: '#4B0082' },
    'kids-princess': { bg1: '#FFB6C1', bg2: '#DDA0DD', frame1: '#FFD700', frame2: '#87CEEB', accent: '#FFB6C1', text: '#4B0082' },
    'default': { bg1: '#262626', bg2: '#1a1a1a', frame1: '#1ABC9C', frame2: '#16a085', accent: '#1ABC9C', text: '#FFFFFF' },
  };

  return styles[styleId] || styles['default'];
}
