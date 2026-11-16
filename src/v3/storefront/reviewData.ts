import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

/**
 * Reviews from verified buyers (spin-hobby-server: src/modules/reviews). A review is tied to the order the item came from, so only
 * a buyer can write one; staff approve each one in Admin > Reviews before it shows here.
 */
export interface Review {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  reply: string | null;
  createdAt: string;
}
export interface ReviewSummary {
  count: number;
  /** One decimal; null with no reviews. */
  average: number | null;
  /** How many reviews gave 5, 4, 3, 2 and 1 stars. */
  stars: number[];
}
export interface ReviewList {
  summary: ReviewSummary;
  items: Review[];
}

const NO_REVIEWS: ReviewList = { summary: { count: 0, average: null, stars: [0, 0, 0, 0, 0] }, items: [] };

/** A product's approved reviews; null while loading, and an empty list when the server can't say. */
export function useReviews(itemId: string | undefined) {
  const list = useQuery({
    queryKey: ["products", "reviews", itemId?.toLowerCase()],
    enabled: !!itemId,
    // reviews appear only after staff approve them, so an answer is good for five minutes
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ReviewList> => {
      const r = await api<ReviewList>(`/products/${encodeURIComponent(itemId ?? "")}/reviews`);
      return { summary: r.summary, items: r.items };
    },
  });
  return list.data ?? (list.isError ? NO_REVIEWS : null);
}
