import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { products } from '../../data/products';

const physicalProducts = products.filter((p) => p.type === 'physical');

export function PhysicalProductShowcase() {
  if (physicalProducts.length === 0) return null;

  return (
    <section className="py-12 sm:py-16" aria-labelledby="physical-product-heading">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <p className="text-xs text-secondary uppercase tracking-[0.2em] mb-2">
            Products
          </p>
          <h3 id="physical-product-heading" className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
            形にして届ける
          </h3>
          <p className="text-muted text-sm mt-2">
            肖像画をアクリルスタンドやキャンバスに。特別なギフトにも。
          </p>
        </div>

        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:snap-none">
          {physicalProducts.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-[75vw] sm:w-auto snap-center bg-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-all duration-300"
            >
              <h4 className="font-serif text-lg font-semibold text-foreground mb-1">
                {product.name}
              </h4>
              <p className="text-xl font-bold text-primary mb-2">
                ¥{product.price.toLocaleString()}
                <span className="text-xs font-normal text-muted ml-1">（税込）</span>
              </p>
              <p className="text-sm text-muted mb-4 leading-relaxed">
                {product.description}
              </p>
              {product.isRecommended && (
                <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-3">
                  一番人気
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-6">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            すべてのプランを見る
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
