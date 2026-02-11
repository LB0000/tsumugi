export interface Category {
  id: 'pets' | 'family' | 'kids';
  name: string;
  headline: string;
  subheadline: string;
  heroDescription: string;
  uploadHint: string;
  trustText: string;
  basePrice: number;
  sampleImages: string[];
}

export type StyleCategoryId = 'all' | 'western' | 'japanese' | 'pop';

export interface ArtStyle {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  colorPalette: string[];
  isIntelligent: boolean;
  tier: 'free' | 'starter' | 'studio';
  category: Exclude<StyleCategoryId, 'all'>;
  tags?: string[];
}

export interface StyleCategory {
  id: StyleCategoryId;
  name: string;
  description: string;
  icon: string;
}

export interface StyleFilterState {
  searchQuery: string;
  selectedTier: 'all' | 'free' | 'starter' | 'studio';
  selectedCategory: StyleCategoryId;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  priceExcludingTax?: number;
  credits: number;
  downloads: number | 'unlimited';
  styleCount: number | 'all';
  hasWatermark: boolean;
  hasRetryTools: boolean;
  hasPrecisionEditor: 'none' | 'simple' | 'advanced';
  features: string[];
  badge?: 'popular' | 'best-value' | 'limited';
  pricePerCredit: number;
  pointsEarned?: number;
  tagline?: string;
  popularPercent?: number;
  savingsNote?: string;
}

export interface LegalInfo {
  販売業者: string;
  運営統括責任者: string;
  所在地: string;
  電話番号: string;
  メールアドレス: string;
  商品代金以外の必要料金: string;
  支払方法: string;
  支払時期: string;
  商品の引渡時期: string;
  返品について: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'order' | 'payment' | 'delivery' | 'product' | 'other';
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  comment: string;
  productType: 'pets' | 'family' | 'kids';
  imageUrl?: string;
}

export interface PrintSize {
  id: string;
  dimensions: string;
  price: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  children?: NavItem[];
  isNew?: boolean;
}

export interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  previewUrl: string | null;
  errorMessage: string | null;
}

export interface GenerateImageRequest {
  baseImage: string;
  styleId: string;
  category: 'pets' | 'family' | 'kids';
  options?: {
    gender?: 'masculine' | 'feminine' | 'neutral';
    customPrompt?: string;
  };
}

export interface GenerateImageResponse {
  success: boolean;
  projectId: string;
  generatedImage: string;
  thumbnailImage: string;
  watermarked: boolean;
  creditsUsed: number;
  creditsRemaining: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string; // Product Name
  artStyleId: string;
  artStyleName: string; // Style Name
  imageUrl: string;
  quantity: number;
  price: number;
  options?: Record<string, unknown>;
}
