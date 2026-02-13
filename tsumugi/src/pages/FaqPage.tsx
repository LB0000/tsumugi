import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { faqs } from '../data/legal';
import { Breadcrumb, SearchBar } from '../components/common';

const categoryLabels: Record<string, string> = {
  all: 'すべて',
  order: '注文について',
  payment: 'お支払いについて',
  delivery: '配送について',
  product: '商品について',
  other: 'その他'
};

export function FaqPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = useMemo(() => {
    let result = selectedCategory === 'all'
      ? faqs
      : faqs.filter(faq => faq.category === selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        faq =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      );
    }

    return result;
  }, [selectedCategory, searchQuery]);

  const categories = ['all', ...Array.from(new Set(faqs.map(faq => faq.category)))];

  return (
    <div className="flex-1 py-12 bg-background">
      <div className="max-w-3xl mx-auto px-4">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[{ label: 'よくある質問' }]}
          className="mb-8"
        />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
            よくある質問
          </h1>
          <p className="text-muted">
            お客様からよくいただくご質問をまとめました。
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <SearchBar
            placeholder="質問を検索..."
            onChange={setSearchQuery}
            className="max-w-md mx-auto"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-card border border-border text-foreground hover:bg-card-hover'
              }`}
            >
              {categoryLabels[category] || category}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted">
                {searchQuery ? `「${searchQuery}」に一致する質問が見つかりませんでした。` : 'このカテゴリに質問がありません。'}
              </p>
            </div>
          )}
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-card rounded-[var(--radius-card)] border border-border overflow-hidden"
            >
              <button
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-card-hover transition-colors"
              >
                <span className="font-medium text-foreground pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-muted flex-shrink-0 transition-transform ${
                    openId === faq.id ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openId === faq.id && (
                <div className="px-6 pb-4">
                  <p className="text-muted leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 p-6 bg-card rounded-[var(--radius-card)] border border-border text-center">
          <h2 className="font-semibold text-foreground mb-2">
            お探しの質問が見つかりませんか？
          </h2>
          <p className="text-muted mb-4">
            お気軽にサポートチームまでお問い合わせください。
          </p>
          <a
            href="/support"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-[var(--radius-button)] hover:bg-primary-hover transition-colors font-medium"
          >
            お問い合わせ
          </a>
        </div>
      </div>
    </div>
  );
}
