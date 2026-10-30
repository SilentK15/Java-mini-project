import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { ArrowRight } from "lucide-react";

export function Login() {
  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      await login(email.trim(), password);
      success("Welcome back! Signed in successfully.");
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.message || "Failed to sign in. Please verify your credentials.";
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        width: "100%",
        padding: "var(--space-8) 0",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "420px",
          width: "100%",
          padding: "var(--space-8)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-1)" }}>Citizen & Staff Login</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Access Thane Municipal Corporation Grievance Portal
          </p>
        </div>

        {errorMessage && (
          <div
            className="animate-fade-in"
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--status-rejected-bg)",
              border: "1px solid var(--status-rejected-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--status-rejected-text)",
              fontSize: "0.875rem",
              marginBottom: "var(--space-4)",
              fontWeight: 500,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya.patil@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your account password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "var(--space-4)", height: "44px" }}
          >
            {loading ? (
              "Authenticating..."
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "var(--space-6)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--border-subtle)",
            textAlign: "center",
            fontSize: "0.875rem",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>Don't have an account yet? </span>
          <Link to="/register" style={{ fontWeight: 600, color: "var(--primary-600)" }}>
            Register as a Citizen
          </Link>
        </div>
      </div>
    </div>
  );
}
