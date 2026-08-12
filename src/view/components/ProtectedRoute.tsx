import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserSelector } from "../../selectors";

// Guards customer-only routes (/account, /orders). Deliberately excludes
// authType === "square" - a merchant/admin session must never satisfy a
// customer route, and vice versa; they're different trust domains.
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useUserSelector();
  const location = useLocation();

  if (!isAuthenticated || user?.authType === "square") {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}
