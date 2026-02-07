import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { products, crossSellProducts } from '../data/products';
import { StyledButton } from '../components/common/StyledButton';

type ProductOption = (typeof products)[number];

export function ResultPage() {
  const navigate = useNavigate();
  const { generatedImage, selectedStyle, addToCart } = useAppStore();
  const [includePostcard, setIncludePostcard] = useState(false);
  const postcard = crossSellProducts[0];

  useEffect(() => {
    if (!generatedImage || !selectedStyle) {
      navigate('/');
    }
  }, [generatedImage, selectedStyle, navigate]);

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary/5 pt-8 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <button
            onClick={() => navigate('/')}
            className="mb-6 inline-flex items-center text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            トップに戻る
          </button>

          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
            傑作が完成しました
          </h1>
          <p className="text-muted mb-8">
            この美しい肖像画を、どのアイテムで残しますか？
          </p>

          <div className="relative max-w-sm mx-auto aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
            <img
              src={generatedImage}
              alt="Generated Portrait"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/30">
                {selectedStyle.name} Style
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-8">
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
