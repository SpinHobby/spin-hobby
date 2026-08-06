import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useCartSelector } from "../../../selectors";
import { setQuantity, removeItem, clearCart } from "../../../reducers";
import calculateSubTotal from "../../../utils/calculateSubTotal";
import { PLACEHOLDER_IMAGE } from "../../../api/square";

export default function Cart() {
  const dispatch = useDispatch();
  const cart = useCartSelector();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 0) newQuantity = 0;
    dispatch(setQuantity({ id, quantity: newQuantity }));
  };

  const handleRemoveItem = (id: string) => {
    dispatch(removeItem(id));
  };

  const handleClearCart = () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      dispatch(clearCart());
    }
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    navigate("/checkout");
  };

  if (cart.items.length === 0) {
    return (
      <div className="wrap">
        <div className="empty-cart">
          <header className="cart-header cf">
            <strong>Shopping Cart</strong>
            <span className="item-count">0 items</span>
          </header>

          <div className="empty-cart-content">
            <div className="empty-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any items to your cart yet.</p>
            <Link to="/" className="btn btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Updating cart...</div>
        </div>
      )}

      <header className="cart-header cf">
        <strong>Shopping Cart</strong>
        <div className="cart-actions">
          <span className="item-count">
            {cart.items.length} item{cart.items.length !== 1 ? "s" : ""}
          </span>
          <button
            className="btn btn-secondary clear-cart"
            onClick={handleClearCart}
            disabled={isLoading}
          >
            Clear Cart
          </button>
        </div>
      </header>

      <div className="cart-table">
        <ul>
          {cart.items.map((item) => {
            const itemTotal = item.quantity * item.price;

            return (
              <li key={item.id} className="item">
                <div className="item-main cf">
                  <div className="item-block ib-info cf">
                    <img
                      className="product-img"
                      src={item.imageUrl || PLACEHOLDER_IMAGE}
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    <div className="ib-info-meta">
                      <span className="title">{item.name}</span>
                      <div className="item-controls">
                        <button
                          className="btn-quantity"
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity - 1)
                          }
                          disabled={isLoading}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.id,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="qty-input"
                          min="0"
                          disabled={isLoading}
                        />
                        <button
                          className="btn-quantity"
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity + 1)
                          }
                          disabled={isLoading}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="item-block ib-qty">
                    <span className="price">${item.price.toFixed(2)} each</span>
                    <span className="quantity">Qty: {item.quantity}</span>
                  </div>
                  <div className="item-block ib-total-price">
                    <span className="tp-price">${itemTotal.toFixed(2)}</span>
                    <button
                      className="tp-remove"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isLoading}
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="item-foot cf">
                  <div className="if-left">
                    <span className="if-status in-stock">✓ In Stock</span>
                    <span className="if-shipping">
                      Ships within 2-3 business days
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sub-table cf">
        <div className="summary-block">
          <ul>
            <li className="subtotal">
              <span className="sb-label">Subtotal</span>
              <span className="sb-value">
                ${calculateSubTotal(cart).toFixed(2)}
              </span>
            </li>
            <li className="shipping">
              <span className="sb-label">Shipping</span>
              <span className="sb-value">Free</span>
            </li>
            <li className="tax">
              <span className="sb-label">Est. Tax</span>
              <span className="sb-value">Calculated at checkout</span>
            </li>
            <li className="grand-total">
              <span className="sb-label">Total</span>
              <span className="sb-value">
                ${calculateSubTotal(cart).toFixed(2)}
              </span>
            </li>
          </ul>
        </div>
        <div className="copy-block">
          <div className="security-info">
            <p>🔒 Secure checkout powered by Square</p>
            <p>💳 All major credit cards accepted</p>
            <p>📞 Questions? Call us at (877) 555-5555</p>
          </div>
        </div>
      </div>

      <div className="cart-footer cf">
        <button
          className="btn btn-primary checkout-btn"
          onClick={handleCheckout}
          disabled={isLoading || cart.items.length === 0}
        >
          Proceed to Checkout
        </button>
        <Link to="/" className="cont-shopping">
          <i className="i-angle-left"></i>Continue Shopping
        </Link>
      </div>
    </div>
  );
}
