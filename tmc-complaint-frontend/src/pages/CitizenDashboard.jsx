import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useComplaints } from "../hooks/useComplaints.js";
import { ComplaintCard } from "../components/ComplaintCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import { readComplaintDraft } from "../complaintDraft.js";

export function CitizenDashboard() {
  const { user } = useAuth();
  const { complaints, loading, error, page, totalPages, totalElements, filters, setPage, updateFilters } = useComplaints();
  const [hasDraft] = useState(() => {
    if (user?.email) {
      const draft = readComplaintDraft(user.email);
      return Boolean(draft && (draft.title || draft.description));
    }
    return false;
  });

  const counts = {
    total: totalElements,
    submitted: complaints.filter((c) => c.status === "SUBMITTED").length,
    inProgress: complaints.filter((c) => c.status === "IN_PROGRESS" || c.status === "ASSIGNED").length,
    resolved: complaints.filter((c) => c.status === "RESOLVED").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Welcome header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "var(--space-1)" }}>Citizen Grievance Dashboard</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
            Welcome, <strong>{user?.name || "Citizen"}</strong>. Track and monitor your reported municipal issues.
          </p>
        </div>
        <Link to="/submit" className="btn btn-primary btn-lg">
          + Lodge New Grievance
        </Link>
      </div>

      {/* Unsaved draft reminder */}
      {hasDraft && (
        <div
          className="card animate-fade-in"
          style={{
            backgroundColor: "var(--status-progress-bg)",
            borderColor: "var(--status-progress-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--space-3) var(--space-4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ fontSize: "1.25rem" }}>📝</span>
            <span style={{ fontSize: "0.875rem", color: "var(--status-progress-text)", fontWeight: 600 }}>
              You have an unfinished complaint draft from an earlier session.
            </span>
          </div>
          <Link to="/submit" className="btn btn-primary btn-sm">
            Resume Draft
          </Link>
        </div>
      )}

      {/* Quick stats cards */}
      <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL REPORTED</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary-600)" }}>{counts.total}</div>
        </div>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>SUBMITTED / PENDING</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--status-submitted-text)" }}>{counts.submitted}</div>
        </div>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>IN PROGRESS</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--status-progress-text)" }}>{counts.inProgress}</div>
        </div>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>RESOLVED</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--status-resolved-text)" }}>{counts.resolved}</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div
        className="card"
        style={{
          padding: "var(--space-4)",
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-2)", flex: "1 1 240px" }}>
          <input
            type="text"
            placeholder="Search your complaints by title or location..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="form-input"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <select
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="form-select"
            style={{ width: "auto" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => updateFilters({ category: e.target.value })}
            className="form-select"
            style={{ width: "auto" }}
          >
            <option value="ALL">All Categories</option>
            <option value="ROAD">Roads / Potholes</option>
            <option value="GARBAGE">Garbage / Waste</option>
            <option value="WATER">Water Supply</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="STREET_LIGHT">Street Lights</option>
            <option value="DRAINAGE">Drainage / Sewage</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Complaint cards grid / list */}
      {loading ? (
        <div className="grid-cards">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <div className="card" style={{ padding: "var(--space-6)", color: "var(--status-rejected-text)" }}>
          <p>{error}</p>
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No complaints found"
          description={
            filters.search || filters.status !== "ALL" || filters.category !== "ALL"
              ? "No grievances match your current search and filters."
              : "You have not lodged any municipal complaints yet."
          }
          actionText={filters.search || filters.status !== "ALL" ? "Clear Filters" : "Lodge a Complaint"}
          onAction={() => {
            if (filters.search || filters.status !== "ALL") {
              updateFilters({ search: "", status: "ALL", category: "ALL" });
            } else {
              window.location.href = "/submit";
            }
          }}
        />
      ) : (
        <div className="grid-cards">
          {complaints.map((c) => (
            <ComplaintCard key={c.id || c.complaintNumber} complaint={c} />
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn btn-secondary btn-sm"
          >
            ← Previous
          </button>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn btn-secondary btn-sm"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
