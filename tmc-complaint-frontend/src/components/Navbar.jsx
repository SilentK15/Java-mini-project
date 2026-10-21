import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export function Navbar({ onOpenTracker, currentLanguage = "en", onLanguageChange }) {
  const { user, isCitizen, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("civicconnect_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("civicconnect_theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("civicconnect_theme", "light");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header
      style={{
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="app-container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "64px",
          gap: "var(--space-4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none" }}>
            <span style={{ fontSize: "1.5rem" }}>🏛️</span>
            <div>
              <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--primary-700)", letterSpacing: "-0.02em" }}>
                CivicConnect
              </span>
              <span style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600 }}>
                THANE MUNICIPAL CORP
              </span>
            </div>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {user ? (
              <>
                <Link to="/dashboard" className="btn btn-secondary btn-sm">
                  Dashboard
                </Link>
                {isCitizen && (
                  <Link to="/submit" className="btn btn-primary btn-sm">
                    + Lodge Complaint
                  </Link>
                )}
                {isAdmin && (
                  <>
                    <Link to="/admin/analytics" className="btn btn-secondary btn-sm">
                      Analytics
                    </Link>
                    <Link to="/admin/staff" className="btn btn-secondary btn-sm">
                      Staff
                    </Link>
                  </>
                )}
              </>
            ) : null}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {onOpenTracker && (
            <button
              onClick={onOpenTracker}
              className="btn btn-secondary btn-sm"
              title="Track Public Complaint"
            >
              🔍 Track
            </button>
          )}

          {/* Language selector */}
          <select
            value={currentLanguage}
            onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
            className="form-select"
            style={{ width: "auto", padding: "4px 8px", fontSize: "0.8125rem" }}
            aria-label="Select Language"
          >
            <option value="en">English</option>
            <option value="mr">मराठी</option>
            <option value="hi">हिन्दी</option>
          </select>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className="btn btn-secondary btn-sm"
            style={{ width: "34px", height: "34px", padding: 0 }}
            aria-label="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                {user.name || user.email}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
