import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useComplaints } from "../hooks/useComplaints.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { PriorityBadge } from "../components/PriorityBadge.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { MapPin, Search, ChevronLeft, ChevronRight, Eye, ShieldAlert } from "lucide-react";

export function StaffQueue() {
  const { user } = useAuth();
  const { complaints, loading, error, page, totalPages, filters, setPage, updateFilters } = useComplaints({
    status: "ALL",
  });

  const department = user?.department || "Department";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
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
              Field Squad Operations
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>Ward Ticket Work Queue</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", marginTop: "2px" }}>
            Assigned ward tickets for <strong>{user?.name || "Officer"}</strong> &bull; {department.replace("_", " ")}
          </p>
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
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 260px", position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Filter queue by title, area, or reference number..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="form-input"
            style={{ paddingLeft: "36px", height: "40px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <select
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="form-select"
            style={{ width: "auto", height: "40px", fontSize: "0.8125rem" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted (New)</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => updateFilters({ priority: e.target.value })}
            className="form-select"
            style={{ width: "auto", height: "40px", fontSize: "0.8125rem" }}
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority Only</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <div className="card" style={{ padding: "var(--space-6)", color: "var(--status-rejected-text)" }}>
          <p>{error}</p>
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          title="Queue is empty"
          description="There are currently no active grievances waiting in this queue."
        />
      ) : (
        <div className="table-container shadow-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title & Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reported On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id || c.complaintNumber}>
                  <td
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      color: "var(--primary-600)",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {c.complaintNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.title}</div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "2px",
                      }}
                    >
                      <MapPin size={12} style={{ color: "var(--primary-600)" }} />
                      <span>{c.location}</span>
                    </div>
                  </td>
                  <td>
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : ""}
                  </td>
                  <td>
                    <Link
                      to={`/complaints/${c.complaintNumber || c.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ height: "32px" }}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--space-3)" }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft size={15} />
            <span>Prev</span>
          </button>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
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
