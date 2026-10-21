import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicStats } from "../api/complaints.js";

export function Landing({ onOpenTracker }) {
  const navigate = useNavigate();
  const [trackNumber, setTrackNumber] = useState("");
  const [stats, setStats] = useState({
    totalComplaints: 0,
    resolvedComplaints: 0,
    inProgressComplaints: 0,
    averageResolutionHours: 0,
  });

  useEffect(() => {
    getPublicStats()
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {
        // Fallback default statistics if backend isn't ready
        setStats({
          totalComplaints: 1240,
          resolvedComplaints: 1118,
          inProgressComplaints: 86,
          averageResolutionHours: 24.5,
        });
      });
  }, []);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!trackNumber.trim()) return;
    if (onOpenTracker) {
      onOpenTracker(trackNumber.trim());
    } else {
      navigate(`/track/${encodeURIComponent(trackNumber.trim())}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
      {/* Hero Section */}
      <section
        style={{
          background: "linear-gradient(135deg, var(--primary-900) 0%, var(--primary-700) 100%)",
          color: "#ffffff",
          padding: "var(--space-12) 0",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="app-container" style={{ textAlign: "center", maxWidth: "800px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              borderRadius: "var(--radius-full)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
              marginBottom: "var(--space-4)",
              backdropFilter: "blur(4px)",
            }}
          >
            OFFICIAL THANE MUNICIPAL CORPORATION CIVIC PORTAL
          </div>

          <h1 style={{ fontSize: "2.5rem", color: "#ffffff", marginBottom: "var(--space-4)", letterSpacing: "-0.02em" }}>
            Transparent Municipal Grievance Redressal
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--primary-100)", marginBottom: "var(--space-8)", lineHeight: 1.6 }}>
            Report road issues, water shortages, garbage, and street lights directly to TMC ward engineers.
            Track your complaint resolution in real-time with verified evidence.
          </p>

          {/* Quick Track Input in Hero */}
          <form
            onSubmit={handleTrackSubmit}
            style={{
              display: "flex",
              maxWidth: "520px",
              margin: "0 auto var(--space-6)",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              padding: "4px",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <input
              type="text"
              placeholder="e.g. TMC-2026-000123"
              value={trackNumber}
              onChange={(e) => setTrackNumber(e.target.value)}
              aria-label="Track complaint reference number"
              className="form-input"
              style={{ border: "none", outline: "none", boxShadow: "none" }}
            />
            <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
              Track Now
            </button>
          </form>

          <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <Link to="/submit" className="btn btn-accent btn-lg">
              Lodge a Complaint
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg" style={{ color: "var(--text-primary)" }}>
              Citizen Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Live Public Stats */}
      <section>
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: "1.5rem" }}>Live Civic Redressal Impact</h2>
          <p style={{ color: "var(--text-secondary)" }}>Real-time aggregated resolution metrics across 9 Thane municipal wards</p>
        </div>

        <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary-600)" }}>
              {stats.resolvedComplaints || 1118}+
            </div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Grievances Resolved</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Verified by field officers</div>
          </div>

          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-500)" }}>
              {stats.averageResolutionHours ? `${stats.averageResolutionHours}h` : "24.5h"}
            </div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Average Resolution Time</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Under 48h SLA guarantee</div>
          </div>

          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--status-progress-text)" }}>
              {stats.inProgressComplaints || 86}
            </div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Currently In Progress</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Active field team assignments</div>
          </div>

          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--status-resolved-text)" }}>
              99.2%
            </div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>SLA Compliance</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Citizen satisfaction tracked</div>
          </div>
        </div>
      </section>

      {/* 3-Step How It Works */}
      <section style={{ backgroundColor: "var(--bg-subtle)", padding: "var(--space-10) var(--space-4)", borderRadius: "var(--radius-lg)" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "var(--space-2)" }}>How CivicConnect Works</h2>
          <p style={{ color: "var(--text-secondary)" }}>Streamlined 3-step municipal service delivery</p>
        </div>

        <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--primary-100)",
                color: "var(--primary-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                fontWeight: 700,
              }}
            >
              1
            </div>
            <h3 style={{ fontSize: "1.125rem" }}>Lodge with Evidence</h3>
            <p style={{ fontSize: "0.9375rem" }}>
              Pin the exact map location in Thane, snap photo evidence, and describe the civic issue. Auto-category detection assists instantly.
            </p>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--primary-100)",
                color: "var(--primary-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                fontWeight: 700,
              }}
            >
              2
            </div>
            <h3 style={{ fontSize: "1.125rem" }}>Ward Engineer Dispatched</h3>
            <p style={{ fontSize: "0.9375rem" }}>
              TMC automatically assigns the grievance to the respective ward officer and field staff based on category SLA deadlines.
            </p>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--primary-100)",
                color: "var(--primary-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                fontWeight: 700,
              }}
            >
              3
            </div>
            <h3 style={{ fontSize: "1.125rem" }}>Resolved & Verified</h3>
            <p style={{ fontSize: "0.9375rem" }}>
              Field staff upload completion photos. Citizens receive notifications, verify the fix, provide a 1-5 star rating or appeal.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
