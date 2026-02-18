import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Palette, AlertTriangle, Loader2, Clock, Image as ImageIcon } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { products, crossSellProducts } from '../data/products';
import { StyledButton } from '../components/common/StyledButton';
import { ShareButtons } from '../components/common/ShareButtons';
import { TrustBadges } from '../components/common/TrustBadges';
import { updateMetaTags } from '../lib/seo';
import { NameEngravingSection } from '../components/result/NameEngravingSection';
import { useTextOverlay } from '../hooks/useTextOverlay';
import { useDiscountTimer } from '../hooks/useDiscountTimer';
import { useAddToCart } from '../hooks/useAddToCart';
import { useResultPageGuard } from '../hooks/useResultPageGuard';
import { useScrollFab } from '../hooks/useScrollFab';
import { useSessionSync } from '../hooks/useSessionSync';
import { DISCOUNT_RATE, PREVIEW_GENERATED_AT_KEY } from '../data/constants';

type ProductOption = (typeof products)[number];

const SESSION_KEY = 'tsumugi-result';

export function ResultPage() {
  const navigate = useNavigate();
  const { generatedImage, selectedStyle, uploadState, resetUpload, setGeneratedImage, gallerySaved, portraitName, setPortraitName, textOverlaySettings, setTextOverlaySettings } = useAppStore();
  const postcard = crossSellProducts[0];
  const beforeImage = uploadState.previewUrl;
  const { isWithin24Hours, timeRemaining } = useDiscountTimer(PREVIEW_GENERATED_AT_KEY);
  const discountPercent = Math.round(DISCOUNT_RATE * 100);

  // Redirect to home if required data is missing
  useResultPageGuard();

  // Show FAB after scrolling
  const showFab = useScrollFab();

  // Text overlay for name engraving (applied to cart items)
  const { overlayedImageUrl, isProcessing: isOverlayProcessing, processingStage, error: overlayError } = useTextOverlay({
    baseImageUrl: generatedImage || '',
    styleId: selectedStyle?.id || '',
    portraitName: portraitName,
    imageWidth: 1024,
    imageHeight: 1024,
    overlaySettings: textOverlaySettings,
  });

  // Cart management
  const { addedProductId, addProductToCart } = useAddToCart({
    styleId: selectedStyle?.id || '',
    styleName: selectedStyle?.name || '',
    overlayedImageUrl,
    portraitName,
    textOverlaySettings,
    isWithin24Hours,
  });

  // Save only IDs to sessionStorage (no base64 image data)
  useSessionSync({
    key: SESSION_KEY,
    data: selectedStyle ? { styleId: selectedStyle.id } : null,
    enabled: !!(generatedImage && selectedStyle),
  });

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
    addProductToCart(product);
  };

  const handleAddPostcard = () => {
    if (!postcard) return;
    addProductToCart(postcard);
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
              あなただけの肖像画が完成しました
            </h1>
            <p className="text-muted text-sm sm:text-base">
              世界にひとつだけの一枚。今すぐ残しませんか？
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
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                    <ImageIcon className="w-8 h-8 text-muted/50" />
                    <p className="text-muted text-xs sm:text-sm text-center">
                      元の写真が読み込めませんでした
                    </p>
                    <p className="text-muted/70 text-xs text-center">
                      生成画像はカートに保存されています
                    </p>
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

          {/* Name Engraving Section */}
          <div className="max-w-3xl mx-auto mt-8">
            <NameEngravingSection
              baseImageUrl={generatedImage}
              styleId={selectedStyle.id}
              portraitName={portraitName}
              onNameChange={setPortraitName}
              overlaySettings={textOverlaySettings}
              onSettingsChange={setTextOverlaySettings}
              isProcessing={isOverlayProcessing}
              processingStage={processingStage}
            />
            {/* Overlay processing feedback */}
            {isOverlayProcessing && portraitName && (
              <div className="mt-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <p className="text-sm text-blue-800">名前を画像に追加しています...</p>
              </div>
            )}
            {overlayError && (
              <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-800">{overlayError}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 24時間限定10%オフバナー */}
      {isWithin24Hours && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm sm:text-base font-bold text-amber-900 mb-1">
                  🎁 今だけ特典：プレビュー完成から24時間限定
                </p>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                  この作品の購入で<span className="font-semibold">全商品{discountPercent}%オフ</span>。<br className="hidden sm:block" />
                  24時間を過ぎると通常料金に戻ります。
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-xs font-mono bg-white/80 px-2 py-1 rounded border border-amber-200">
                    残り時間: <span className="font-bold text-amber-700">{timeRemaining}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product section */}
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Urgency notice */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-xs sm:text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            プレビュー画像は保存されません。商品購入で高解像度版を永久保存できます。
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-muted text-sm">
            お好きな形で、この肖像画を残せます
          </p>
        </div>

        {/* Product grid - 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {products.map((product, index) => (
            <article
              key={product.id}
              className={`bg-card rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-border hover:border-primary/50 transition-all duration-300 animate-cardEnter stagger-${index + 1}`}
            >
              <div className="mb-5 sm:mb-6">
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground mb-2">
                  {product.name}
                </h3>
                <p className="text-xl sm:text-2xl font-bold text-primary mb-2">
                  {isWithin24Hours ? (
                    <>
                      <span className="line-through text-muted text-lg mr-2">
                        ¥{product.price.toLocaleString()}
                      </span>
                      <span className="text-amber-600">
                        ¥{Math.floor(product.price * (1 - DISCOUNT_RATE)).toLocaleString()}
                      </span>
                      <span className="text-xs text-amber-700 ml-2 font-normal">{discountPercent}%OFF</span>
                    </>
                  ) : (
                    `¥${product.price.toLocaleString()}`
                  )}
                </p>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted">
                    {product.description}
                  </p>
                  {product.emotionalCopy && (
                    <p className="text-xs sm:text-sm font-medium text-primary/80 italic">
                      {product.emotionalCopy}
                    </p>
                  )}
                </div>
              </div>

              {addedProductId === product.id ? (
                <StyledButton className="w-full bg-green-600 hover:bg-green-600 text-white border-green-600" disabled>
                  <Check className="w-4 h-4 mr-2" />
                  追加しました
                </StyledButton>
              ) : (
                <StyledButton
                  onClick={() => handleAddToCart(product)}
                  className="w-full"
                  variant="outline"
                  disabled={!!addedProductId || isOverlayProcessing || (!!overlayError && !!portraitName)}
                >
                  {isOverlayProcessing ? '名前を追加中...' : 'カートに追加'}
                  {!isOverlayProcessing && !overlayError && <ArrowRight className="w-4 h-4 ml-2" />}
                </StyledButton>
              )}
            </article>
          ))}
        </div>

        {/* Postcard cross-sell */}
        {postcard && (
          <div className="mt-8">
            <p className="text-center text-sm text-muted mb-4">一緒にいかがですか？</p>
            <article className="max-w-sm mx-auto bg-card rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-border hover:border-primary/50 transition-all duration-300 animate-cardEnter stagger-4">
              <div className="mb-4">
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                  {postcard.name}
                </h3>
                <p className="text-xl font-bold text-primary mb-2">
                  {isWithin24Hours ? (
                    <>
                      <span className="line-through text-muted text-lg mr-2">
                        ¥{postcard.price.toLocaleString()}
                      </span>
                      <span className="text-amber-600">
                        ¥{Math.floor(postcard.price * (1 - DISCOUNT_RATE)).toLocaleString()}
                      </span>
                      <span className="text-xs text-amber-700 ml-2 font-normal">{discountPercent}%OFF</span>
                    </>
                  ) : (
                    `¥${postcard.price.toLocaleString()}`
                  )}
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-muted">{postcard.description}</p>
                  {postcard.emotionalCopy && (
                    <p className="text-xs sm:text-sm font-medium text-primary/80 italic">
                      {postcard.emotionalCopy}
                    </p>
                  )}
                </div>
              </div>

              {addedProductId === postcard.id ? (
                <StyledButton className="w-full bg-green-600 hover:bg-green-600 text-white border-green-600" disabled>
                  <Check className="w-4 h-4 mr-2" />
                  追加しました
                </StyledButton>
              ) : (
                <StyledButton
                  onClick={handleAddPostcard}
                  className="w-full"
                  variant="outline"
                  disabled={!!addedProductId || isOverlayProcessing || (!!overlayError && !!portraitName)}
                >
                  カートに追加
                  <ArrowRight className="w-4 h-4 ml-2" />
                </StyledButton>
              )}
            </article>
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
                <p className="text-xs text-primary font-bold">
                  {isWithin24Hours ? (
                    <>
                      <span className="line-through text-muted mr-1">¥{cheapestProduct.price.toLocaleString()}</span>
                      <span className="text-amber-600">¥{Math.floor(cheapestProduct.price * (1 - DISCOUNT_RATE)).toLocaleString()}</span>
                    </>
                  ) : (
                    `¥${cheapestProduct.price.toLocaleString()}`
                  )}
                </p>
              </div>
              {addedProductId === cheapestProduct.id ? (
                <StyledButton size="sm" className="bg-green-600 hover:bg-green-600 text-white border-green-600" disabled>
                  <Check className="w-3 h-3 mr-1" />
                  追加済
                </StyledButton>
              ) : (
                <StyledButton
                  size="sm"
                  onClick={() => handleAddToCart(cheapestProduct)}
                  disabled={!!addedProductId || isOverlayProcessing || (!!overlayError && !!portraitName)}
                >
                  {isOverlayProcessing ? '処理中...' : 'カートに追加'}
                </StyledButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
