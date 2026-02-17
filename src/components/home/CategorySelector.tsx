import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { categories } from '../../data/categories';
import type { Category } from '../../types';

const categoryCopy: Record<Category['id'], string> = {
  pets: 'うちの子を名画の主人公に',
  family: '家族の笑顔を一生の宝物に',
  kids: '今だけの表情を残す',
};

function CategorySelectorBase() {
  const { selectedCategory } = useAppStore();

  return (
    <section className="py-8 sm:py-12" aria-label="カテゴリを選ぶ">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <Link
                key={cat.id}
                to={`/${cat.id}`}
                className={`group rounded-xl overflow-hidden transition-all duration-300 ${
                  isActive
                    ? 'glass-card-selected'
                    : 'glass-card'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={cat.sampleImages[0]}
                    alt={`${cat.name}カテゴリのサンプル`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 sm:p-4 text-center">
                  <p className={`font-serif text-sm sm:text-base font-semibold ${
                    isActive ? 'text-primary' : 'text-foreground'
                  }`}>
                    {cat.name}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted mt-1 hidden sm:block leading-relaxed">
                    {categoryCopy[cat.id]}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const CategorySelector = memo(CategorySelectorBase);
