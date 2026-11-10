import { useEffect, useState } from "react";
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

/** A product's approved reviews; null while loading, and an empty list when the server can't say. */
export function useReviews(itemId: string | undefined) {
  const [list, setList] = useState<ReviewList | null>(null);
  useEffect(() => {
    if (!itemId) return;
    let live = true;
    setList(null);
    api<ReviewList>(`/products/${encodeURIComponent(itemId)}/reviews`)
      .then((r) => live && setList({ summary: r.summary, items: r.items }))
      .catch(() => live && setList({ summary: { count: 0, average: null, stars: [0, 0, 0, 0, 0] }, items: [] }));
    return () => {
      live = false;
    };
  }, [itemId]);
  return list;
}
