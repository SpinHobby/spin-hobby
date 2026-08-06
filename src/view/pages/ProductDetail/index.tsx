import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Previewer } from "../Product/ImageSlider/ImageSlider";
import { getCatalogItem } from "../../../api/square";
import { addItem } from "../../../reducers";
import { IMerchPreview } from "../../../ts";
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
        } else {
          setProduct(result);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!product?.id) return;
    dispatch(
      addItem({
        id: product.id,
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

          <button className="btn-add-to-cart-large" onClick={handleAddToCart}>
            {added ? "✓ Added to Cart" : "🛒 Add to Cart"}
          </button>

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
