import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, ThumbsUp, Target } from 'lucide-react';
import type { Review, ReviewSummary } from '../types/reviews';
import { getReviews, getReviewSummary } from '../api/reviews';
import { getGoals } from '../api/strategy';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={16} className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
      ))}
    </div>
  );
}

const RATING_COLORS: Record<number, string> = {
  5: 'bg-emerald-500', 4: 'bg-green-400', 3: 'bg-yellow-400', 2: 'bg-orange-400', 1: 'bg-red-400',
};

const BORDER_COLORS: Record<number, string> = {
  5: 'border-l-emerald-500', 4: 'border-l-green-400', 3: 'border-l-yellow-400', 2: 'border-l-orange-400', 1: 'border-l-red-400',
};

type FilterType = 'all' | '5' | '4' | 'low';

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortNewest, setSortNewest] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(200);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [reviewsData, summaryData, goalsRes] = await Promise.all([getReviews(), getReviewSummary(), getGoals().catch(() => ({ goals: [] }))]);
      setReviews(reviewsData);
      setSummary(summaryData);
      const reviewGoal = goalsRes.goals.find((g) => g.category === 'reviews');
      if (reviewGoal) setReviewTarget(reviewGoal.targetValue);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredReviews = reviews
    .filter((r) => {
      if (filter === '5') return r.rating === 5;
      if (filter === '4') return r.rating === 4;
      if (filter === 'low') return r.rating <= 3;
      return true;
    })
    .sort((a, b) => sortNewest
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  const fiveStarPct = summary && summary.totalReviews > 0
    ? Math.round(((summary.ratingDistribution['5'] || 0) / summary.totalReviews) * 100)
    : 0;

  const maxDist = summary ? Math.max(...Object.values(summary.ratingDistribution), 1) : 1;

  if (loading) return <div className="p-6 text-text-secondary">読み込み中...</div>;
  if (error) return <div className="p-6"><p className="text-danger mb-2">{error}</p><button onClick={fetchData} className="text-sm text-primary hover:underline">再試行</button></div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-xl font-bold flex items-center gap-2"><Star size={22} /> レビュー管理</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">総レビュー数</span>
            <MessageSquare size={18} className="text-text-secondary" />
          </div>
          <p className="text-2xl font-bold">{summary?.totalReviews ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">平均評価</span>
            <Star size={18} className="text-text-secondary" />
          </div>
          <p className="text-2xl font-bold">{summary?.averageRating?.toFixed(1) ?? '-'}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">5つ星の割合</span>
            <ThumbsUp size={18} className="text-text-secondary" />
          </div>
          <p className="text-2xl font-bold">{fiveStarPct}%</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">目標達成率</span>
            <Target size={18} className="text-text-secondary" />
          </div>
          <p className="text-2xl font-bold">{summary?.totalReviews ?? 0}<span className="text-sm font-normal text-text-secondary"> / {reviewTarget}</span></p>
        </div>
      </div>

      {/* Rating Distribution */}
      {summary && (
        <div className="bg-white rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold mb-4">評価分布</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.ratingDistribution[String(star)] || 0;
              const width = maxDist > 0 ? (count / maxDist) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12 justify-end">
                    <span className="text-sm font-medium">{star}</span>
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className={`${RATING_COLORS[star]} h-5 rounded-full transition-all`} style={{ width: `${Math.max(width, 2)}%` }} />
                  </div>
                  <span className="text-sm text-text-secondary w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {([['all', 'すべて'], ['5', '5つ星'], ['4', '4つ星'], ['low', '3つ星以下']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === key ? 'bg-primary/10 text-primary font-medium' : 'bg-surface-secondary text-text-secondary hover:bg-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setSortNewest(!sortNewest)} className="text-sm text-text-secondary hover:text-text">
            {sortNewest ? '新しい順' : '古い順'}
          </button>
        </div>

        {filteredReviews.length > 0 ? (
          <div className="space-y-3">
            {filteredReviews.map((review) => (
              <div key={review.id} className={`bg-white rounded-xl border border-border border-l-4 ${BORDER_COLORS[review.rating] || ''} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{review.userName}</span>
                    <StarRating rating={review.rating} />
                    {review.productType && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{review.productType}</span>}
                  </div>
                  <span className="text-xs text-text-secondary">{new Date(review.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
                <p className="text-sm text-text">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary bg-white rounded-xl border border-border p-8 text-center">
            {reviews.length === 0 ? 'レビューがまだありません' : 'この条件に一致するレビューはありません'}
          </p>
        )}
      </section>
    </div>
  );
}
