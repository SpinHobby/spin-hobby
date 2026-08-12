import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUserSelector } from "../../../selectors";
import { getOrders, IOrder } from "../../../api/orders";
import { getWishlist } from "../../../api/wishlist";

export function Summary() {
  const { user } = useUserSelector();
  const [recentOrders, setRecentOrders] = useState<IOrder[]>([]);
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOrders(), getWishlist()])
      .then(([orders, wishlist]) => {
        setRecentOrders(orders.slice(0, 3));
        setWishlistCount(wishlist.length);
      })
      .catch((err) => console.error("Error loading account summary:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div id="account-summary">
      <p className="account-summary-line">
        <strong>Name:</strong> {user?.fname || "-"} {user?.lname || ""}
      </p>
      <p className="account-summary-line">
        <strong>Email:</strong> {user?.email || "-"}
      </p>
      <p className="account-summary-line">
        <strong>Wishlist:</strong> {wishlistCount ?? "-"} item{wishlistCount === 1 ? "" : "s"}
      </p>

      <h3>Recent Orders</h3>
      {loading ? (
        <p>Loading...</p>
      ) : recentOrders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div className="account-order-list">
          {recentOrders.map((order) => (
            <Link to={`/orders/${order.id}`} className="account-order-row" key={order.id}>
              <span>Order #{order.id}</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              <span>${(order.totalCents / 100).toFixed(2)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
