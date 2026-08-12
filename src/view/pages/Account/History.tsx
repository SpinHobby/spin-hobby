import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOrders, IOrder } from "../../../api/orders";

export function History() {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch((err) => setError(err.message || "Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div id="account-history">Loading...</div>;
  if (error) return <div id="account-history" className="account-error">{error}</div>;
  if (orders.length === 0) return <div id="account-history">No orders yet.</div>;

  return (
    <div id="account-history">
      <div className="account-order-list">
        {orders.map((order) => (
          <Link to={`/orders/${order.id}`} className="account-order-card" key={order.id}>
            <div className="account-order-card-header">
              <span>Order #{order.id}</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              <span className="account-order-status">{order.status}</span>
            </div>
            <div className="account-order-card-items">
              {order.items.map((item, i) => (
                <span key={i}>
                  {item.quantity}× {item.name}
                </span>
              ))}
            </div>
            <div className="account-order-card-total">
              ${(order.totalCents / 100).toFixed(2)} {order.currency}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
