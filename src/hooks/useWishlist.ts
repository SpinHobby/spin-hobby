import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserSelector } from "../selectors";
import { getWishlist, addToWishlist, removeFromWishlist } from "../api/wishlist";
import { IMerchPreview } from "../ts";

// Shared wishlist state for any page that renders product cards. Logged-out
// users get redirected to sign in rather than a silent no-op or a
// localStorage-backed guest wishlist (which would need a merge-on-login
// story that isn't part of this pass).
export function useWishlist() {
  const { isAuthenticated, user } = useUserSelector();
  const isCustomer = isAuthenticated && user?.authType !== "square";
  const navigate = useNavigate();
  const location = useLocation();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isCustomer) {
      setWishlistIds(new Set());
      return;
    }
    getWishlist()
      .then((items) => setWishlistIds(new Set(items.map((i) => i.id).filter(Boolean) as string[])))
      .catch((err) => console.error("Error loading wishlist:", err));
  }, [isCustomer]);

  const toggleFavorite = useCallback(
    (product: IMerchPreview) => {
      if (!isCustomer) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }
      const id = product.id;
      if (!id) return;

      const isFav = wishlistIds.has(id);
      const action = isFav ? removeFromWishlist(id) : addToWishlist(id);
      action
        .then(() => {
          setWishlistIds((prev) => {
            const next = new Set(prev);
            if (isFav) next.delete(id);
            else next.add(id);
            return next;
          });
        })
        .catch((err) => console.error("Error updating wishlist:", err));
    },
    [isCustomer, wishlistIds, navigate, location.pathname]
  );

  return {
    isFavorited: (id?: string) => !!id && wishlistIds.has(id),
    toggleFavorite,
  };
}
