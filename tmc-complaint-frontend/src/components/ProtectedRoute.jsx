import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { Skeleton } from "./Skeleton.jsx";

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-container" style={{ padding: "var(--space-12) var(--space-4)" }}>
        <Skeleton height="32px" width="300px" style={{ marginBottom: "var(--space-4)" }} />
        <Skeleton height="200px" width="100%" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
