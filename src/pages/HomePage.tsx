import { useAppStore } from '../stores/appStore';
import { categories } from '../data/categories';
import { ImageUploader, StyleModal, SampleGallery, GeneratePreview, StyleSection, HeroBeforeAfter } from '../components/home';

export function HomePage() {
  const { selectedCategory } = useAppStore();
  const currentCategory = categories.find(c => c.id === selectedCategory);

  if (!currentCategory) return null;

  return (
    <div className="flex-1 bg-background bg-washi">
      {/* Hero Section with Before/After */}
      <HeroBeforeAfter />

      {/* 区切り線 */}
      <div className="divider-japanese max-w-3xl mx-auto" />

      {/* Upload Section */}
      <section id="upload-section" className="py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-secondary text-sm tracking-[0.2em] uppercase mb-3">Step 1</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground ornament-line pb-4">
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
            <p className="text-secondary text-sm tracking-[0.2em] uppercase mb-3">Step 2</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground ornament-line pb-4">
              スタイルを選択
            </h2>
          </div>

          <div className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <StyleSection />
          </div>

          {/* 準備完了セクション */}
          <div id="generate-section" className="scroll-mt-20">
            <GeneratePreview />
          </div>
        </div>
      </section>

      {/* 区切り線 */}
      <div className="divider-japanese max-w-3xl mx-auto" />

      {/* Sample Gallery Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-secondary text-sm tracking-[0.2em] uppercase mb-3">Gallery</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground ornament-line pb-4">
              作品サンプル
            </h2>
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
