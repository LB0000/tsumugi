import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Palette, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useCartStore } from '../stores/cartStore';
import { products, crossSellProducts } from '../data/products';
import { StyledButton } from '../components/common/StyledButton';
import { ShareButtons } from '../components/common/ShareButtons';
import { TrustBadges } from '../components/common/TrustBadges';
import { trackEvent, trackMetaAddToCart } from '../lib/analytics';
import { updateMetaTags } from '../lib/seo';

type ProductOption = (typeof products)[number];

const SESSION_KEY = 'tsumugi-result';

export function ResultPage() {
  const navigate = useNavigate();
  const { generatedImage, selectedStyle, uploadState, resetUpload, setGeneratedImage, gallerySaved } = useAppStore();
  const { addToCart } = useCartStore();
  const [includePostcard, setIncludePostcard] = useState(false);
  const postcard = crossSellProducts[0];
  const beforeImage = uploadState.previewUrl;
  const [showFab, setShowFab] = useState(false);

  const handleScroll = useCallback(() => {
    setShowFab(window.scrollY > 200);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Redirect to home if store has no data (e.g. direct navigation or page reload)
  // Wait for Zustand persist rehydration before checking
  const mountCheckRef = useRef(false);
  useEffect(() => {
    if (mountCheckRef.current) return;

    const check = () => {
      mountCheckRef.current = true;
      const { generatedImage: img, selectedStyle: style } = useAppStore.getState();
      if (!img || !style) {
        navigate('/');
      }
    };

    if (useAppStore.persist.hasHydrated()) {
      check();
    } else {
      const unsubscribe = useAppStore.persist.onFinishHydration(() => {
        check();
        unsubscribe();
      });
    }
  }, [navigate]);

  // Save only IDs to sessionStorage (no base64 image data)
  useEffect(() => {
    if (generatedImage && selectedStyle) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ styleId: selectedStyle.id }));
      } catch { /* ignore storage errors */ }
    }
  }, [generatedImage, selectedStyle]);

  // Update OGP meta tags with generated image
  useEffect(() => {
    if (!generatedImage || !selectedStyle) return;
    return updateMetaTags({
      title: `${selectedStyle.name}スタイルの肖像画 | TSUMUGI`,
      description: `AIが生成した${selectedStyle.name}スタイルの肖像画。TSUMUGIで世界に一つだけのアートを。`,
      ogUrl: 'https://tsumugi.jp/result',
      ogImage: generatedImage,
    });
  }, [generatedImage, selectedStyle]);

  if (!generatedImage || !selectedStyle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted mb-3">結果画面へ移動しています...</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-primary hover:underline"
          >
            トップに戻る
          </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = (product: ProductOption) => {
    trackEvent('add_to_cart', { productId: product.id, price: product.price });
    trackMetaAddToCart({
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: 'JPY',
    });
    addToCart({
      productId: product.id,
      name: product.name,
      artStyleId: selectedStyle.id,
      artStyleName: selectedStyle.name,
      imageUrl: generatedImage,
      quantity: 1,
      price: product.price
    });

    if (includePostcard && postcard) {
      addToCart({
        productId: postcard.id,
        name: postcard.name,
        artStyleId: selectedStyle.id,
        artStyleName: selectedStyle.name,
        imageUrl: generatedImage,
        quantity: 1,
        price: postcard.price
      });
    }

    navigate('/cart');
  };

  const handleRetryWithNewStyle = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setGeneratedImage(null);
    navigate('/');
    setTimeout(() => {
      document.getElementById('style-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleBackToHome = () => {
    sessionStorage.removeItem(SESSION_KEY);
    resetUpload();
    navigate('/');
  };

  const cheapestProduct = products[0];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero: Before/After */}
      <div className="bg-primary/5 pt-6 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Navigation - right-aligned */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleBackToHome}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              トップに戻る
            </button>
          </div>

          <div className="text-center mb-6">
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-2">
              あなただけの傑作です
            </h1>
            <p className="text-muted text-sm sm:text-base">
              {selectedStyle.name} スタイルで変換しました
            </p>
          </div>

          {/* Before / After comparison - always side by side */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:gap-10 max-w-4xl mx-auto items-center">
            {/* Before */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-muted/40" />
                <p className="text-xs sm:text-sm font-medium text-muted tracking-wide">Before</p>
              </div>
              <div className="aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden bg-card border-2 border-border/50 shadow-lg animate-morphIn">
                {beforeImage ? (
                  <img
                    src={beforeImage}
                    alt="元の写真"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                    元の写真
                  </div>
                )}
              </div>
            </div>

            {/* After */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary" />
                <p className="text-xs sm:text-sm font-medium text-primary tracking-wide">After</p>
              </div>
              <div className="aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden bg-card border-2 border-primary/30 shadow-xl shadow-primary/10 relative animate-morphIn" style={{ animationDelay: '0.2s' }}>
                <img
                  src={generatedImage}
                  alt="生成された肖像画"
                  className="w-full h-full object-cover"
                />
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-4 py-2 sm:px-6 sm:py-3 bg-foreground/10 backdrop-blur-sm rounded-xl rotate-[-15deg]">
                    <p className="text-foreground/30 text-base sm:text-xl font-serif tracking-wider">
                      PREVIEW
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gallery save failure warning */}
          {gallerySaved === false && (
            <div className="max-w-2xl mx-auto mt-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                ギャラリーへの保存に失敗しました。画像をダウンロードして保存してください。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Product section */}
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Urgency notice */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-xs sm:text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            プレビュー画像は保存されません。商品購入で高解像度版をお届けします。
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-muted text-sm">
            この美しい肖像画を、どのアイテムで残しますか？
          </p>
        </div>

        {/* Product grid - 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {products.map((product) => (
            <article
              key={product.id}
              className="bg-card rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-border hover:border-primary/50 transition-all duration-300"
            >
              <div className="mb-5 sm:mb-6">
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground mb-2">
                  {product.name}
                </h3>
                <p className="text-xl sm:text-2xl font-bold text-primary mb-2">
                  ¥{product.price.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-muted">
                  {product.description}
                </p>
              </div>

              <StyledButton
                onClick={() => handleAddToCart(product)}
                className="w-full"
                variant="outline"
              >
                カートに追加
                <ArrowRight className="w-4 h-4 ml-2" />
              </StyledButton>
            </article>
          ))}
        </div>

        {/* Postcard cross-sell */}
        {postcard && (
          <div className="mt-8">
            <p className="text-center text-sm text-muted mb-4">一緒にいかがですか？</p>
            <label className="max-w-2xl mx-auto p-4 bg-card rounded-2xl border border-border flex items-start gap-3 cursor-pointer">
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  includePostcard ? 'bg-primary border-primary text-white' : 'border-muted bg-background'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={includePostcard}
                  onChange={(e) => setIncludePostcard(e.target.checked)}
                />
                {includePostcard && <Check className="w-3.5 h-3.5" />}
              </div>
              <div>
                <span className="block text-sm font-semibold text-foreground">
                  ポストカードセットを追加 (+¥{postcard.price.toLocaleString()})
                </span>
                <span className="block text-xs text-muted mt-1">
                  特製ポストカード5枚組を同時にカートへ追加します
                </span>
              </div>
            </label>
          </div>
        )}

        {/* Trust badges */}
        <div className="mt-8">
          <TrustBadges variant="horizontal" />
        </div>

        {/* Share section - downgraded */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted mb-3">この作品をシェアする</p>
          <ShareButtons
            url={window.location.href}
            title={`「${selectedStyle.name}」スタイルで肖像画を作りました！ #TSUMUGI #AI肖像画`}
            className="justify-center"
          />
        </div>

        {/* Retry with different style - ghost text */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleRetryWithNewStyle}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <Palette className="w-4 h-4" />
            別のスタイルで試す
          </button>
        </div>

        {/* Back to home - bottom */}
        <div className="flex justify-center mt-4 mb-8">
          <button
            onClick={handleBackToHome}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            トップに戻る
          </button>
        </div>
      </div>

      {/* Mobile fixed purchase CTA bar */}
      {showFab && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
          <div className="bg-background/95 backdrop-blur-md border-t border-border px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3">
              <img
                src={generatedImage}
                alt=""
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{cheapestProduct.name}</p>
                <p className="text-xs text-primary font-bold">¥{cheapestProduct.price.toLocaleString()}</p>
              </div>
              <StyledButton
                size="sm"
                onClick={() => handleAddToCart(cheapestProduct)}
              >
                カートに追加
              </StyledButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
