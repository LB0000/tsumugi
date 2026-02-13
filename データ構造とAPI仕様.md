# データ構造とAPI仕様

## 1. カテゴリデータ

各カテゴリ（Pets, Family, Kids）に応じて表示内容が変わります。以下のデータ構造を使用してください。

```typescript
interface Category {
  id: 'pets' | 'family' | 'kids';
  name: string;
  headline: string;
  subheadline: string;
  uploadHint: string;
  trustText: string;
  basePrice: number;
  sampleImages: string[];
}

const categories: Category[] = [
  {
    id: 'pets',
    name: 'Pets',
    headline: 'Immortalize Your Pet in a Timeless Masterpiece',
    subheadline: 'Free preview · From $19 to purchase',
    uploadHint: 'Show your pet\'s full face',
    trustText: 'Trusted by 10,000+ Pet Owners',
    basePrice: 19,
    sampleImages: ['/images/sample-dalmatian.jpg', '/images/sample-cat.jpg', '/images/sample-dog.jpg']
  },
  {
    id: 'family',
    name: 'Family',
    headline: 'The Whole Family. One Masterpiece.',
    subheadline: 'Free preview · From $29 to purchase',
    uploadHint: 'Upload one or more photos – people and pets welcome',
    trustText: 'Trusted by 1,000+ Families',
    basePrice: 29,
    sampleImages: ['/images/sample-family-1.jpg', '/images/sample-family-2.jpg', '/images/sample-family-3.jpg']
  },
  {
    id: 'kids',
    name: 'Kids',
    headline: 'Create a Beautiful Portrait of Your Child',
    subheadline: 'Free preview · From $29 to purchase',
    uploadHint: 'Upload one or more photos – siblings and pets welcome',
    trustText: 'Trusted by 1,000+ Parents',
    basePrice: 29,
    sampleImages: ['/images/sample-kids-1.jpg', '/images/sample-kids-2.jpg', '/images/sample-kids-3.jpg']
  }
];
```

## 2. アートスタイルデータ

全19種類のアートスタイルを定義します。以下は確認できた5種類の例です。

```typescript
interface ArtStyle {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  colorPalette: string[];
  isIntelligent: boolean;
  tier: 'free' | 'starter' | 'studio';
}

const artStyles: ArtStyle[] = [
  {
    id: 'intelligent',
    name: 'Intelligent',
    description: 'Let AI choose the perfect style based on your photos',
    thumbnailUrl: '/images/styles/intelligent-icon.svg',
    colorPalette: [],
    isIntelligent: true,
    tier: 'free'
  },
  {
    id: 'baroque-red',
    name: 'Baroque Red',
    description: 'Classic royal portrait with rich velvet drapes and golden baroque frames',
    thumbnailUrl: '/images/styles/baroque-red.jpg',
    colorPalette: ['#8B0000', '#DAA520', '#2F1810', '#F5DEB3'],
    isIntelligent: false,
    tier: 'free'
  },
  {
    id: 'florentine-renaissance',
    name: 'Florentine Renaissance',
    description: 'Timeless elegance with refined brushwork and classical composition',
    thumbnailUrl: '/images/styles/florentine.jpg',
    colorPalette: ['#8B4513', '#D2691E', '#2F2F2F', '#F5F5DC'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'renaissance-sky',
    name: 'Renaissance Sky',
    description: 'Atmospheric Renaissance style with dramatic lighting and old master technique',
    thumbnailUrl: '/images/styles/renaissance-sky.jpg',
    colorPalette: ['#4682B4', '#87CEEB', '#2F4F4F', '#F0E68C'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'rococo',
    name: 'Rococo',
    description: 'Vibrant painterly style with bold brushstrokes and rich color harmonies',
    thumbnailUrl: '/images/styles/rococo.jpg',
    colorPalette: ['#4169E1', '#DC143C', '#FFD700', '#228B22'],
    isIntelligent: false,
    tier: 'starter'
  }
];
```

## 3. 料金プランデータ

```typescript
interface PricingPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  downloads: number | 'unlimited';
  styleCount: number | 'all';
  hasWatermark: boolean;
  hasRetryTools: boolean;
  hasPrecisionEditor: 'none' | 'simple' | 'advanced';
  features: string[];
  badge?: 'popular' | 'best-value';
  pricePerCredit: number;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'digital',
    name: 'Digital Pack',
    price: 29,
    credits: 5,
    downloads: 2,
    styleCount: 1,
    hasWatermark: true,
    hasRetryTools: true,
    hasPrecisionEditor: 'none',
    features: [
      '5 Masterpieces to perfect your masterpiece',
      'Download 2 High-Resolution Portraits',
      'Fable masterpiece style',
      'Retry Tools: Masculine, Feminine, Describe Edit (3 = 1 credit)',
      'Lifetime access to your project',
      'Commercial use rights',
      'Instant access'
    ],
    badge: 'popular',
    pricePerCredit: 5.80
  },
  {
    id: 'starter',
    name: 'Starter Pack',
    price: 49,
    credits: 10,
    downloads: 10,
    styleCount: 6,
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'simple',
    features: [
      '10 Masterpieces to explore styles',
      'Download 10 High-Resolution Portraits',
      '6 curated art styles',
      'Retry Tools: Masculine, Feminine, Describe Edit (3 = 1 credit)',
      'Precision Editor – Simple Mode (3 edits = 1 credit)',
      'Lifetime access',
      'Commercial use rights',
      'Instant download'
    ],
    pricePerCredit: 4.90
  },
  {
    id: 'studio',
    name: 'Studio Pack',
    price: 199,
    credits: 60,
    downloads: 'unlimited',
    styleCount: 'all',
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'advanced',
    features: [
      '60 Masterpieces for unlimited creativity',
      'Download All 60 High-Resolution Masterpieces',
      'All 19 art styles',
      'Unlimited Retries',
      'Advanced Precision Editor (unlimited)',
      'Best value at $3.32 per masterpiece',
      'Commercial use rights'
    ],
    badge: 'best-value',
    pricePerCredit: 3.32
  }
];
```

## 4. アートプリント料金データ

```typescript
interface PrintSize {
  id: string;
  dimensions: string;
  price: number;
}

const printSizes: PrintSize[] = [
  { id: '8x10', dimensions: '8×10"', price: 89 },
  { id: '12x16', dimensions: '12×16"', price: 119 },
  { id: '18x24', dimensions: '18×24"', price: 199 },
  { id: '24x36', dimensions: '24×36"', price: 299 }
];
```

## 5. サポートクイックアクションデータ

```typescript
interface QuickAction {
  id: string;
  label: string;
  icon: string;
}

const quickActions: QuickAction[] = [
  { id: 'download', label: 'Find my download', icon: 'download' },
  { id: 'track', label: 'Track my print', icon: 'truck' },
  { id: 'edit', label: 'Edit my image', icon: 'edit' },
  { id: 'upscale', label: 'Upscale to 4K', icon: 'sparkles' },
  { id: 'payment', label: 'Payment issue', icon: 'credit-card' },
  { id: 'trial', label: 'Trial limit help', icon: 'refresh' },
  { id: 'order', label: 'Order help', icon: 'help-circle' }
];
```

## 6. API エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| POST | `/api/generate-image` | 画像生成リクエスト |
| GET | `/api/styles` | 利用可能なアートスタイル一覧取得 |
| GET | `/api/pricing` | 料金プラン一覧取得 |
| POST | `/api/checkout` | 決済処理開始 |
| GET | `/api/user/projects` | ユーザーのプロジェクト一覧取得 |
| GET | `/api/user/downloads` | ユーザーのダウンロード履歴取得 |

## 7. 画像生成APIの詳細仕様

### リクエスト

```typescript
interface GenerateImageRequest {
  baseImage: string;        // Base64エンコードされた画像
  styleId: string;          // アートスタイルID
  category: 'pets' | 'family' | 'kids';
  options?: {
    gender?: 'masculine' | 'feminine' | 'neutral';
    customPrompt?: string;  // Describe Edit用
  };
}
```

### レスポンス

```typescript
interface GenerateImageResponse {
  success: boolean;
  projectId: string;
  generatedImage: string;   // Base64エンコードされた生成画像
  thumbnailImage: string;   // 低解像度サムネイル
  watermarked: boolean;
  creditsUsed: number;
  creditsRemaining: number;
}
```

### エラーレスポンス

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

## 8. ナビゲーション構造

```typescript
interface NavItem {
  id: string;
  label: string;
  path: string;
  children?: NavItem[];
  isNew?: boolean;
}

const navigation: NavItem[] = [
  { id: 'home', label: 'Home', path: '/' },
  {
    id: 'create',
    label: 'Create',
    path: '/create',
    children: [
      { id: 'pet-portraits', label: 'Pet Portraits', path: '/?tab=pets' },
      { id: 'family-portraits', label: 'Family Portraits', path: '/?tab=family' },
      { id: 'children-portraits', label: "Children's Portraits", path: '/kids' },
      { id: 'couple-portraits', label: 'Couple Portraits', path: '/?tab=family' },
      { id: 'self-portraits', label: 'Self-Portraits', path: '/?tab=family' }
    ]
  },
  { id: 'pricing', label: 'Pricing', path: '/pricing' },
  { id: 'sign-in', label: 'Sign In', path: '/sign-in' },
  { id: 'about', label: 'About Surrealium', path: 'https://surrealium.world/' },
  { id: 'support', label: 'Get Support', path: '/support' }
];
```

