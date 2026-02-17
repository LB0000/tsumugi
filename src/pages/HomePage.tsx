import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { categories } from '../data/categories';
import { categoryMetadata } from '../data/categoryMetadata';
import { updateMetaTags } from '../lib/seo';
import { ImageUploader, StyleModal, SampleGallery, GeneratePreview, StyleSection, HeroBeforeAfter, TrustedBy, TestimonialTicker, PhysicalProductShowcase, CategorySelector } from '../components/home';

const RESULT_SESSION_KEY = 'tsumugi-result';
const VALID_CATEGORIES = ['pets', 'family', 'kids'] as const;

export function HomePage() {
  const { selectedCategory, setSelectedCategory, resetUpload, selectedStyle, setSelectedStyle, setGeneratedImage, setGallerySaved } = useAppStore();
  const { pathname } = useLocation();
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  const categoryFromUrl = VALID_CATEGORIES.includes(segment as typeof VALID_CATEGORIES[number])
    ? (segment as typeof VALID_CATEGORIES[number])
    : null;

  // URLからカテゴリを同期 + カテゴリ変更時は生成結果のみリセット（アップロード画像は保持）
  useEffect(() => {
    if (!categoryFromUrl || categoryFromUrl === selectedCategory) return;
    setSelectedCategory(categoryFromUrl);
    setGeneratedImage(null);
    setGallerySaved(null);

    // 現在のスタイルが新カテゴリと互換性がない場合はリセット
    if (selectedStyle?.availableCategories &&
        !selectedStyle.availableCategories.includes(categoryFromUrl)) {
      setSelectedStyle(null);
    }
  }, [categoryFromUrl, selectedCategory, setSelectedCategory, setGeneratedImage, setGallerySaved, selectedStyle, setSelectedStyle]);

  // SEOメタタグを動的に更新
  useEffect(() => {
    const meta = categoryMetadata[selectedCategory];
    if (!meta) return;
    return updateMetaTags({
      title: meta.title,
      description: meta.description,
      ogUrl: `https://tsumugi.jp/${selectedCategory}`,
    });
  }, [selectedCategory]);

  const currentCategory = categories.find(c => c.id === selectedCategory);

  useEffect(() => {
    const hasResultSession = sessionStorage.getItem(RESULT_SESSION_KEY);
    if (!hasResultSession) return;
    sessionStorage.removeItem(RESULT_SESSION_KEY);
    resetUpload();
  }, [resetUpload]);

  if (!currentCategory) {
    return (
      <div className="flex-1 bg-background bg-washi flex items-center justify-center px-4 py-20">
        <p className="text-muted text-sm">ページを読み込み中です...</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 bg-background bg-washi"
      style={{ '--category-accent': currentCategory.accent } as React.CSSProperties}
    >
      {/* Hero Section with Before/After */}
      <HeroBeforeAfter />

      {/* 信頼メトリクス — Hero直後にシームレスに接続 */}
      <TrustedBy />

      {/* カテゴリセレクター */}
      <CategorySelector />

      {/* Upload Section */}
      <section id="upload-section" className="py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4" aria-hidden="true">
              <span className="w-8 h-px bg-category-accent" />
              <span className="text-xs text-category-accent tracking-[0.3em] font-medium">01</span>
              <span className="w-8 h-px bg-category-accent" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
              写真をアップロード
            </h2>
          </div>

          <div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <ImageUploader />
          </div>
        </div>
      </section>

      {/* 区切り線 */}
      <div className="divider-japanese max-w-3xl mx-auto" />

      {/* Style Selection Section */}
      <section id="style-section" className="py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4" aria-hidden="true">
              <span className="w-8 h-px bg-category-accent" />
              <span className="text-xs text-category-accent tracking-[0.3em] font-medium">02</span>
              <span className="w-8 h-px bg-category-accent" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
              スタイルを選択
            </h2>
          </div>

          <div className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <StyleSection />
          </div>
        </div>
      </section>

      {/* 区切り線 */}
      <div className="divider-japanese max-w-3xl mx-auto" />

      {/* Generate Section */}
      <section id="generate-section" className="py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4" aria-hidden="true">
              <span className="w-8 h-px bg-category-accent" />
              <span className="text-xs text-category-accent tracking-[0.3em] font-medium">03</span>
              <span className="w-8 h-px bg-category-accent" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
              肖像画を生成
            </h2>
          </div>

          <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <GeneratePreview />
          </div>
        </div>
      </section>

      {/* 区切り線 */}
      <div className="divider-japanese max-w-3xl mx-auto" />

      {/* テスティモニアルティッカー */}
      <TestimonialTicker categoryFilter={selectedCategory} />

      {/* 区切り線 */}
      <div className="divider-japanese max-w-3xl mx-auto" />

      {/* フィジカル商品ショーケース */}
      <PhysicalProductShowcase />

      {/* 区切り線 */}
      <div className="divider-japanese max-w-3xl mx-auto" />

      {/* Sample Gallery Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-category-accent text-sm tracking-[0.2em] uppercase mb-3">Gallery</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground ornament-line pb-4">
              作品サンプル
            </h2>
            <p className="text-muted text-sm sm:text-base mt-3">
              写真がどう変わるか、スタイル別にご覧ください
            </p>
          </div>

          <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <SampleGallery />
          </div>
        </div>
      </section>

      {/* Style Modal */}
      <StyleModal />
    </div>
  );
}
