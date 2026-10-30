import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useComplaints } from "../hooks/useComplaints.js";
import { ComplaintCard } from "../components/ComplaintCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import { readComplaintDraft } from "../complaintDraft.js";
import { FileText, PlusCircle, Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";

export function CitizenDashboard() {
  const { user } = useAuth();
  const { complaints, loading, error, page, totalPages, totalElements, counts: backendCounts, filters, setPage, updateFilters } = useComplaints();
  const [hasDraft] = useState(() => {
    if (user?.email) {
      const draft = readComplaintDraft(user.email);
      return Boolean(draft && (draft.title || draft.description));
    }
    return false;
  });

  const counts = {
    total: backendCounts?.total ?? totalElements,
    submitted: backendCounts?.submitted ?? complaints.filter((c) => c.status === "SUBMITTED").length,
    inProgress: backendCounts?.inProgress ?? complaints.filter((c) => c.status === "IN_PROGRESS" || c.status === "ASSIGNED").length,
    resolved: backendCounts?.resolved ?? complaints.filter((c) => c.status === "RESOLVED").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          paddingBottom: "var(--space-2)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--primary-600)",
                backgroundColor: "var(--primary-50)",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              Citizen Portal
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>Citizen Grievance Redressal</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", marginTop: "2px" }}>
            Welcome back, <strong>{user?.name || "Citizen"}</strong>. Monitor and track your municipal reports.
          </p>
        </div>

        <Link to="/submit" className="btn btn-accent btn-lg">
          <PlusCircle size={18} />
          <span>Lodge New Grievance</span>
        </Link>
      </div>

      {/* Unsaved draft notification */}
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
            <FileText size={18} style={{ color: "var(--status-progress-text)", flexShrink: 0 }} />
            <span style={{ fontSize: "0.875rem", color: "var(--status-progress-text)", fontWeight: 600 }}>
              You have an unfinished complaint draft from an earlier session.
            </span>
          </div>
          <Link to="/submit" className="btn btn-primary btn-sm">
            Resume Draft
          </Link>
        </div>
      )}

      {/* Quick stats strip */}
      <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="stat-widget primary">
          <div className="stat-title">Total Reported</div>
          <div className="stat-num" style={{ color: "var(--primary-600)" }}>{counts.total}</div>
          <div className="stat-desc">All lifetime grievances</div>
        </div>

        <div className="stat-widget primary">
          <div className="stat-title">Submitted / Pending</div>
          <div className="stat-num" style={{ color: "var(--status-submitted-text)" }}>{counts.submitted}</div>
          <div className="stat-desc">Awaiting department triage</div>
        </div>

        <div className="stat-widget warning">
          <div className="stat-title">In Progress</div>
          <div className="stat-num" style={{ color: "var(--status-progress-text)" }}>{counts.inProgress}</div>
          <div className="stat-desc">Assigned to field squads</div>
        </div>

        <div className="stat-widget success">
          <div className="stat-title">Resolved & Verified</div>
          <div className="stat-num" style={{ color: "var(--status-resolved-text)" }}>{counts.resolved}</div>
          <div className="stat-desc">Work completed by TMC</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: "var(--space-4)",
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 280px", position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search grievances by title, description or location..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="form-input"
            style={{ paddingLeft: "36px", height: "40px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={14} style={{ color: "var(--text-muted)" }} />
            <select
              value={filters.status}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="form-select"
              style={{ width: "auto", height: "40px", fontSize: "0.8125rem" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <select
            value={filters.category}
            onChange={(e) => updateFilters({ category: e.target.value })}
            className="form-select"
            style={{ width: "auto", height: "40px", fontSize: "0.8125rem" }}
          >
            <option value="ALL">All Categories</option>
            <option value="ROAD">Roads / Potholes</option>
            <option value="GARBAGE">Garbage / Waste</option>
            <option value="WATER">Water Supply</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="STREET_LIGHT">Street Lights</option>
            <option value="DRAINAGE">Drainage / Sewage</option>
          </select>
        </div>
      </div>

      {/* Complaint cards grid */}
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
          title="No complaints found"
          description={
            filters.search || filters.status !== "ALL" || filters.category !== "ALL"
              ? "No grievances match your current search criteria."
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
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-4)",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft size={15} />
            <span>Previous</span>
          </button>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn btn-secondary btn-sm"
          >
            <span>Next</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
