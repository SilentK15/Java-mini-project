import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div style={{ maxWidth: "500px", margin: "var(--space-12) auto", textAlign: "center" }}>
      <div className="card" style={{ padding: "var(--space-8)" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "var(--space-2)" }}>🏛️ 404</div>
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
