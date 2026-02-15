import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, Palette } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { products, crossSellProducts } from '../data/products';
import { StyledButton } from '../components/common/StyledButton';

type ProductOption = (typeof products)[number];

const SESSION_KEY = 'tsumugi-result';

export function ResultPage() {
  const navigate = useNavigate();
  const { generatedImage, selectedStyle, uploadState, resetUpload, addToCart, setGeneratedImage } = useAppStore();
  const [includePostcard, setIncludePostcard] = useState(false);
  const postcard = crossSellProducts[0];
  const beforeImage = uploadState.previewUrl;

  // Redirect to home if store has no data (e.g. direct navigation or page reload)
  useEffect(() => {
    if (!generatedImage || !selectedStyle) {
      navigate('/');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save only IDs to sessionStorage (no base64 image data)
  useEffect(() => {
    if (generatedImage && selectedStyle) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ styleId: selectedStyle.id }));
      } catch { /* ignore storage errors */ }
    }
  }, [generatedImage, selectedStyle]);

  if (!generatedImage || !selectedStyle) return null;

  const handleAddToCart = (product: ProductOption) => {
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
    // スタイルセクションへスクロール（遷移後に実行）
    setTimeout(() => {
      document.getElementById('style-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleBackToHome = () => {
    sessionStorage.removeItem(SESSION_KEY);
    resetUpload();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero: Before/After */}
      <div className="bg-primary/5 pt-8 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Navigation */}
          <div className="text-center mb-6">
            <button
              onClick={handleBackToHome}
              className="inline-flex items-center text-sm text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              トップに戻る
            </button>
          </div>

          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-2">
              傑作が完成しました
            </h1>
            <p className="text-muted">
              {selectedStyle.name} スタイルで変換しました
            </p>
          </div>

          {/* Before / After comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 max-w-4xl mx-auto items-center">
            {/* Before */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-muted/40" />
                <p className="text-sm font-medium text-muted tracking-wide">Before</p>
              </div>
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-card border-2 border-border/50 shadow-lg">
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

            {/* Arrow connector (desktop only) */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              {/* Rendered via the gap between grid items */}
            </div>

            {/* After */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <p className="text-sm font-medium text-primary tracking-wide">After</p>
              </div>
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-card border-2 border-primary/30 shadow-xl shadow-primary/10 relative">
                <img
                  src={generatedImage}
                  alt="生成された肖像画"
                  className="w-full h-full object-cover"
                />
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-6 py-3 bg-foreground/10 backdrop-blur-sm rounded-xl rotate-[-15deg]">
                    <p className="text-foreground/30 text-xl font-serif tracking-wider">
                      PREVIEW
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile arrow between images */}
          <div className="flex md:hidden justify-center -mt-3 -mb-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-primary rotate-90" />
            </div>
          </div>

          {/* Retry with different style */}
          <div className="flex justify-center mt-8">
            <button
              onClick={handleRetryWithNewStyle}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-full transition-colors"
            >
              <Palette className="w-4 h-4" />
              別のスタイルで試す
            </button>
          </div>
        </div>
      </div>

      {/* Product options */}
      <div className="max-w-6xl mx-auto px-4 -mt-4">
        <div className="text-center mb-8 pt-8">
          <p className="text-muted text-sm">
            この美しい肖像画を、どのアイテムで残しますか？
          </p>
        </div>

        {postcard && (
          <label className="max-w-2xl mx-auto mb-8 p-4 bg-card rounded-2xl border border-border flex items-start gap-3 cursor-pointer">
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
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <article
              key={product.id}
              className={`bg-card rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 relative overflow-hidden ${
                product.isRecommended ? 'border-primary ring-4 ring-primary/10' : 'border-border hover:border-primary/50'
              }`}
            >
              {product.isRecommended && (
                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                  RECOMMENDED
                </div>
              )}

              <div className="mb-6 min-h-[116px]">
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                  {product.name}
                </h3>
                <p className="text-2xl font-bold text-primary mb-2">
                  ¥{product.price.toLocaleString()}
                </p>
                <p className="text-sm text-muted">
                  {product.description}
                </p>
              </div>

              <StyledButton
                onClick={() => handleAddToCart(product)}
                className="w-full"
                variant={product.isRecommended ? 'primary' : 'outline'}
              >
                カートに追加
                <ArrowRight className="w-4 h-4 ml-2" />
              </StyledButton>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
