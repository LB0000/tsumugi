export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  imageUrl: string | null;
  orderId: string | null;
  productType: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<string, number>;
}
