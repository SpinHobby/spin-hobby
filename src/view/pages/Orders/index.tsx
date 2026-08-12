import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useUserSelector } from "../../../selectors";
import { getOrder, getOrders, lookupGuestOrder, IOrder } from "../../../api/orders";
import "./orders.scss";

export default function Orders() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useUserSelector();
  const isCustomer = isAuthenticated && user?.authType !== "square";

  const paymentIdParam = searchParams.get("paymentId");
  const emailParam = searchParams.get("email");

  const [order, setOrder] = useState<IOrder | null>(null);
  const [orders, setOrders] = useState<IOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lookupEmail, setLookupEmail] = useState(emailParam || "");
  const [lookupPaymentId, setLookupPaymentId] = useState(paymentIdParam || "");

  useEffect(() => {
    if (id && isCustomer) {
      setLoading(true);
      getOrder(Number(id))
        .then(setOrder)
        .catch((err) => setError(err.message || "Order not found"))
        .finally(() => setLoading(false));
    } else if (paymentIdParam && emailParam) {
      setLoading(true);
      lookupGuestOrder(paymentIdParam, emailParam)
        .then(setOrder)
        .catch((err) => setError(err.message || "Order not found"))
        .finally(() => setLoading(false));
    } else if (isCustomer) {
      setLoading(true);
      getOrders()
        .then(setOrders)
        .catch((err) => setError(err.message || "Failed to load orders"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, isCustomer, paymentIdParam, emailParam]);

  function handleGuestLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupPaymentId || !lookupEmail) return;
    setLoading(true);
    setError("");
    lookupGuestOrder(lookupPaymentId, lookupEmail)
      .then(setOrder)
      .catch((err) => setError(err.message || "Order not found"))
      .finally(() => setLoading(false));
  }

  if (loading) return <div className="orders-page"><p>Loading...</p></div>;

  // Single order view (logged-in ownership-checked, or guest lookup result)
  if (order) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <h1>Order #{order.id}</h1>
          <p className="orders-meta">
            {new Date(order.createdAt).toLocaleDateString()} · {order.status}
          </p>
          <div className="orders-items">
            {order.items.map((item, i) => (
              <div className="orders-item-row" key={i}>
                <span>{item.quantity}× {item.name}</span>
                <span>${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="orders-total">
            Total: ${(order.totalCents / 100).toFixed(2)} {order.currency}
          </div>
          <div className="orders-address">
            <h3>Shipping to</h3>
            <p>
              {order.shippingAddress.fname} {order.shippingAddress.lname}
              <br />
              {order.shippingAddress.address1}
              {order.shippingAddress.address2 ? `, ${order.shippingAddress.address2}` : ""}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
              {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in order list
  if (orders) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <h1>Your Orders</h1>
          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            orders.map((o) => (
              <a href={`/orders/${o.id}`} className="orders-list-row" key={o.id}>
                <span>Order #{o.id}</span>
                <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                <span>${(o.totalCents / 100).toFixed(2)}</span>
              </a>
            ))
          )}
        </div>
      </div>
    );
  }

  // Guest lookup form
  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1>Find Your Order</h1>
        {error && <p className="orders-error">{error}</p>}
        <form className="orders-lookup-form" onSubmit={handleGuestLookup}>
          <label>
            <span>Payment ID (from your confirmation)</span>
            <input
              value={lookupPaymentId}
              onChange={(e) => setLookupPaymentId(e.target.value)}
              required
            />
          </label>
          <label>
            <span>Email used at checkout</span>
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="orders-lookup-btn">
            Find Order
          </button>
        </form>
      </div>
    </div>
  );
}
