import { useState } from 'react';
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { postReview } from '../../api/reviews';

interface ReviewFormProps {
  orderId: string;
  category?: 'pets' | 'family' | 'kids';
  styleId?: string;
  onSubmitted?: () => void;
}

export function ReviewForm({ orderId, category = 'pets', styleId = 'default', onSubmitted }: ReviewFormProps) {
  const authUser = useAuthStore((s) => s.authUser);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authUser) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <h3 className="font-semibold text-foreground mb-2">レビューを投稿</h3>
        <p className="text-sm text-muted">
          レビューを投稿するにはログインが必要です
        </p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-sage/20 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-accent-sage" />
        </div>
        <p className="font-semibold text-foreground mb-1">レビューありがとうございます！</p>
        <p className="text-sm text-muted">お客様のご意見はサービス改善に活用させていただきます。</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('評価を選択してください');
      return;
    }
    if (comment.trim().length === 0) {
      setError('コメントを入力してください');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await postReview({
        orderId,
        rating,
        comment: comment.trim(),
        category,
        styleId,
      });
      setIsSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビューの投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h3 className="font-semibold text-foreground">レビューを投稿</h3>

      {/* Star Rating */}
      <div>
        <p className="text-sm text-muted mb-2">評価</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
              aria-label={`${value}つ星`}
            >
              <Star
                className={`w-7 h-7 ${
                  value <= displayRating
                    ? 'text-secondary fill-secondary'
                    : 'text-muted/30'
                } transition-colors`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted">{rating}/5</span>
          )}
        </div>
      </div>

      {/* Comment */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="review-comment" className="text-sm text-muted">コメント</label>
          <span className={`text-xs ${comment.length > 450 ? 'text-red-500' : 'text-muted'}`}>
            {comment.length}/500
          </span>
        </div>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          placeholder="商品やサービスの感想をお聞かせください..."
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            送信中...
          </>
        ) : (
          'レビューを投稿する'
        )}
      </button>
    </form>
  );
}
