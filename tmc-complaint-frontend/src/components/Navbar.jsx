import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { Landmark, Search, LogOut, PlusCircle, LayoutDashboard, BarChart3, Users } from "lucide-react";

export function Navbar({ onOpenTracker, currentLanguage = "en", onLanguageChange }) {
  const { user, isCitizen, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("civicconnect_theme");
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header
      style={{
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "var(--shadow-xs)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="app-container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "var(--navbar-height)",
          flexDirection: "row",
        }}
      >
        {/* Brand Logo & Main Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(29, 78, 216, 0.25)",
              }}
            >
              <Landmark size={20} />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "1.125rem",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                CivicConnect
              </div>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "0.625rem",
                  color: "var(--primary-600)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Thane Municipal Corp
              </span>
            </div>
          </Link>

          {/* Navigation Links for Logged-in Users */}
          {user && (
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <Link
                to="/dashboard"
                className={`btn btn-sm ${isActive("/dashboard") ? "btn-primary" : "btn-ghost"}`}
                style={{ height: "34px" }}
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </Link>

              {isCitizen && (
                <Link
                  to="/submit"
                  className={`btn btn-sm ${isActive("/submit") ? "btn-accent" : "btn-ghost"}`}
                  style={{ height: "34px" }}
                >
                  <PlusCircle size={14} />
                  <span>Lodge Complaint</span>
                </Link>
              )}

              {isAdmin && (
                <>
                  <Link
                    to="/admin/analytics"
                    className={`btn btn-sm ${isActive("/admin/analytics") ? "btn-primary" : "btn-ghost"}`}
                    style={{ height: "34px" }}
                  >
                    <BarChart3 size={14} />
                    <span>Analytics</span>
                  </Link>
                  <Link
                    to="/admin/staff"
                    className={`btn btn-sm ${isActive("/admin/staff") ? "btn-primary" : "btn-ghost"}`}
                    style={{ height: "34px" }}
                  >
                    <Users size={14} />
                    <span>Staff</span>
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right Actions Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {/* Quick Track Button */}
          {onOpenTracker && (
            <button
              onClick={onOpenTracker}
              className="btn btn-secondary btn-sm"
              title="Track Public Complaint"
              style={{ height: "34px", padding: "0 12px" }}
            >
              <Search size={14} />
              <span>Track</span>
            </button>
          )}

          {/* User Section */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginLeft: "var(--space-1)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-subtle)",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    backgroundColor: "var(--primary-600)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                  }}
                >
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    color: "var(--text-primary)",
                    maxWidth: "140px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name || user.email}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Sign out"
                style={{ height: "34px" }}
              >
                <LogOut size={13} />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Link to="/login" className="btn btn-secondary btn-sm" style={{ height: "34px" }}>
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ height: "34px" }}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
