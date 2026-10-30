import { Link } from "react-router-dom";
import { Landmark } from "lucide-react";

export function NotFound() {
  return (
    <div style={{ maxWidth: "500px", margin: "var(--space-12) auto", textAlign: "center" }}>
      <div className="card" style={{ padding: "var(--space-8)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "50%", background: "var(--primary-50)", color: "var(--primary-600)", marginBottom: "var(--space-3)" }}>
          <Landmark size={32} />
        </div>
        <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--primary-700)", marginBottom: "var(--space-2)" }}>404</div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-2)" }}>Page Not Found</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)", fontSize: "0.9375rem" }}>
          The municipal portal resource you requested does not exist or has been relocated.
        </p>
        <Link to="/" className="btn btn-primary">
          Return to Portal Home
        </Link>
      </div>
    </div>
  );
}
