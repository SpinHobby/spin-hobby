import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ECurrencySymbols, ECurrencyCodes, IMerchPreview } from "../../../ts";
import { useCurrencySelector } from "../../../selectors";
import { roundToDecimal } from "../../../utils/math";
import classNames from "classnames";

interface Props extends IMerchPreview {
  additionalClassNames?: string;
  isCompact?: boolean;
  showQuickView?: boolean;
  isFavorited?: boolean;
  onAddToCart?: (product: IMerchPreview) => void;
  onQuickView?: (product: IMerchPreview) => void;
  onToggleFavorite?: (product: IMerchPreview) => void;
}

export function FeaturedMerch(props: Props) {
  const currency = useCurrencySelector();
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    title,
    name,
    img,
    images,
    price,
    originalPrice,
    discountPercentage,
    isFeatured,
    isNewArrival,
    isPreorder,
    stockCount,
    isFavorited = false,
    additionalClassNames,
    onAddToCart,
    onToggleFavorite,
  } = props;

  const displayTitle = title || name || "Untitled Product";
  const displayImage = img || (images && images[0]) || "";
  const displayPrice = price || 0;
  const hasDiscount = originalPrice && originalPrice > displayPrice;
  const discount = hasDiscount
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : discountPercentage;
  const isSoldOut = stockCount === 0;

  const goToDetail = () => {
    if (props.id) navigate(`/product/${props.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSoldOut) return;
    onAddToCart?.(props);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(props);
  };

  const getBadges = () => {
    const badges = [];
    if (isSoldOut) badges.push({ text: "Sold out", type: "sold-out" });
    if (isPreorder) badges.push({ text: "Pre-order", type: "preorder" });
    if (isNewArrival) badges.push({ text: "New", type: "new" });
    if (hasDiscount || discount)
      badges.push({ text: `${discount}% Off`, type: "sale" });
    return badges;
  };

  return (
    <div
      className={classNames(["cards-featured-merch", additionalClassNames])}
      onClick={goToDetail}
      role="link"
      tabIndex={0}
    >
      <div className="cards-featured-merch-image-container">
        {displayImage && (
          <img
            src={displayImage}
            alt={displayTitle}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        )}

        {getBadges().length > 0 && (
          <div className="cards-featured-merch-badges">
            {getBadges().map((badge, index) => (
              <span key={index} className={`badge ${badge.type}`}>
                {badge.text}
              </span>
            ))}
          </div>
        )}

        <button
          className={classNames("cards-featured-merch-favorite", {
            favorited: isFavorited,
          })}
          onClick={handleToggleFavorite}
          aria-label="Add to favorites"
        >
          {isFavorited ? "❤️" : "🤍"}
        </button>

        <button
          className={classNames("cards-featured-merch-cart-btn", {
            disabled: isSoldOut,
          })}
          onClick={handleAddToCart}
          disabled={isSoldOut}
          aria-label={isSoldOut ? "Sold out" : "Add to cart"}
        >
          🛒
        </button>
      </div>

      <div className="cards-featured-merch-details">
        <h3 className="cards-featured-merch-title">{displayTitle}</h3>

        <div className="cards-featured-merch-price">
          {currency.base === currency.conversion ? (
            <span className="price-current">
              {ECurrencySymbols[currency.base]}
              {displayPrice.toFixed(2)}
            </span>
          ) : (
            <span className="price-current">
              {ECurrencySymbols[currency.conversion]}
              {roundToDecimal(displayPrice * currency.rate, 2)}
            </span>
          )}
          {hasDiscount && (
            <span className="price-original">
              {ECurrencySymbols[currency.base]}
              {originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
