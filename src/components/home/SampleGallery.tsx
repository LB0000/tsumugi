import { memo, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { categories } from '../../data/categories';

export const SampleGallery = memo(function SampleGallery() {
  const { selectedCategory } = useAppStore();

  const currentCategory = useMemo(
    () => categories.find(c => c.id === selectedCategory),
    [selectedCategory]
  );

  if (!currentCategory) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
      {currentCategory.sampleImages.map((image, index) => (
        <div
          key={index}
          className="relative aspect-[4/5] rounded-2xl overflow-hidden group cursor-pointer border-2 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1"
        >
          <img
            loading="lazy"
            src={image}
            alt={`サンプル ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

          {/* Label */}
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <p className="text-white text-sm font-medium">
              サンプル {index + 1}
            </p>
            <p className="text-white/70 text-xs mt-1">
              クリックして拡大
            </p>
          </div>

          {/* Corner Accent */}
          <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-secondary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
            <span className="text-white text-xs font-bold">{index + 1}</span>
          </div>
        </div>
      ))}
    </div>
  );
});
