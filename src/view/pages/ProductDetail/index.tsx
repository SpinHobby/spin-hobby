import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Previewer } from "../Product/ImageSlider/ImageSlider";
import { getCatalogItem, getInventoryCounts } from "../../../api/square";
import { addItem } from "../../../reducers";
import { IMerchPreview } from "../../../ts";
import { useWishlist } from "../../../hooks/useWishlist";
import "./productDetail.scss";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [product, setProduct] = useState<IMerchPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { isFavorited, toggleFavorite } = useWishlist();

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setNotFound(false);
    setAdded(false);
    setQuantity(1);

    getCatalogItem(id)
      .then((result) => {
        if (!result) {
          setNotFound(true);
          return;
        }
        setProduct(result);
        if (result.variationId) {
          getInventoryCounts([result.variationId])
            .then((counts) => {
              if (result.variationId! in counts) {
                setProduct((current) =>
                  current ? { ...current, stockCount: counts[result.variationId!] } : current
                );
              }
            })
            .catch((err) => console.error("Error loading inventory count:", err));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  const isSoldOut = product?.stockCount === 0;

  const handleAddToCart = () => {
    if (!product?.id || !product.variationId || isSoldOut) return;
    dispatch(
      addItem({
        id: product.id,
        variationId: product.variationId,
        name: product.title,
        price: product.price,
        imageUrl: product.img,
        quantity,
      })
    );
    setAdded(true);
  };

  if (isLoading) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-loading">Loading product...</div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-not-found">
          <h2>Product not found</h2>
          <p>This item may no longer be available.</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="product-detail-breadcrumb">
        <button onClick={() => navigate("/")} className="breadcrumb-btn">
          Home
        </button>
        <span>›</span>
        <span className="breadcrumb-current">{product.title}</span>
      </div>

      <div className="product-detail-content">
        <div className="product-detail-images">
          <Previewer imageSource={product.images || [product.img]} />
        </div>

        <div className="product-detail-info">
          <h1>{product.title}</h1>
          <div className="product-detail-price">${product.price.toFixed(2)}</div>

          {product.description && (
            <p className="product-detail-description">{product.description}</p>
          )}

          {isSoldOut ? (
            <p className="product-detail-sold-out">Sold out</p>
          ) : (
            <div className="product-detail-quantity">
              <span>Quantity</span>
              <div className="quantity-controls">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  min={1}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
                <button onClick={() => setQuantity((q) => q + 1)}>+</button>
              </div>
            </div>
          )}

          <div className="product-detail-actions">
            <button
              className="btn-add-to-cart-large"
              onClick={handleAddToCart}
              disabled={isSoldOut}
            >
              {isSoldOut ? "Sold out" : added ? "✓ Added to Cart" : "🛒 Add to Cart"}
            </button>

            <button
              className={`btn-wishlist${isFavorited(product.id) ? " favorited" : ""}`}
              onClick={() => toggleFavorite(product)}
              aria-label={
                isFavorited(product.id) ? "Remove from wishlist" : "Add to wishlist"
              }
            >
              {isFavorited(product.id) ? "❤️" : "🤍"}
            </button>
          </div>

          {added && (
            <Link to="/cart" className="view-cart-link">
              View Cart →
            </Link>
          )}

          <ul className="product-detail-trust">
            <li>🔒 Secure checkout via Square</li>
            <li>✅ 100% authentic merchandise</li>
            <li>📦 Ships within 2-3 business days</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
