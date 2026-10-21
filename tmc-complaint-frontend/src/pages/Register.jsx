import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { PasswordStrength } from "../components/PasswordStrength.jsx";
import { evaluatePassword } from "../utils/password.js";

export function Register() {
  const { register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage("Please fill in all registration fields.");
      return;
    }
    const pwdEval = evaluatePassword(password);
    if (!pwdEval.checks.length) {
      setErrorMessage("Password must be at least 10 characters long.");
      return;
    }
    if (!pwdEval.checks.notCommon) {
      setErrorMessage("Please choose a more secure password.");
      return;
    }
    if (!pwdEval.checks.bytes) {
      setErrorMessage("Password exceeds maximum limit of 72 bytes.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      await register(name.trim(), email.trim(), password);
      success("Account created successfully! Welcome to CivicConnect.");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.message || "Failed to create account. Please try again.";
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "480px", margin: "var(--space-8) auto", width: "100%" }}>
      <div className="card" style={{ padding: "var(--space-8)" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "var(--space-1)" }}>Citizen Registration</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Register to lodge grievances and track municipal resolutions
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
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Patil"
            />
          </div>

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
              autoComplete="new-password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password (min 10 chars)"
            />
            <PasswordStrength password={password} />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "var(--space-4)", padding: "var(--space-3)" }}
          >
            {loading ? "Creating Account..." : "Create Citizen Account"}
          </button>
        </form>

        <div style={{ marginTop: "var(--space-6)", textAlign: "center", fontSize: "0.875rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>Already registered? </span>
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
