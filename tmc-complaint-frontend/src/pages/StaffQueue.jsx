import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useComplaints } from "../hooks/useComplaints.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { PriorityBadge } from "../components/PriorityBadge.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import { EmptyState } from "../components/EmptyState.jsx";

export function StaffQueue() {
  const { user } = useAuth();
  const { complaints, loading, error, page, totalPages, filters, setPage, updateFilters } = useComplaints({
    status: "ALL",
  });

  const department = user?.department || "Department";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "var(--space-1)" }}>Field Staff Work Queue</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
            Assigned ward tickets for <strong>{user?.name || "Officer"}</strong> ({department})
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="card" style={{ padding: "var(--space-4)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "space-between" }}>
        <input
          type="text"
          placeholder="Filter queue by title, area, or reference..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="form-input"
          style={{ flex: "1 1 240px" }}
        />

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <select
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="form-select"
            style={{ width: "auto" }}
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
            style={{ width: "auto" }}
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
          icon="✅"
          title="Queue is empty"
          description="There are currently no active grievances waiting in this queue."
        />
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "12px 16px" }}>Reference</th>
                <th style={{ padding: "12px 16px" }}>Title & Location</th>
                <th style={{ padding: "12px 16px" }}>Priority</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Created</th>
                <th style={{ padding: "12px 16px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id || c.complaintNumber} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700, color: "var(--primary-600)" }}>
                    {c.complaintNumber}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>📍 {c.location}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Link to={`/complaints/${c.complaintNumber || c.id}`} className="btn btn-secondary btn-sm">
                      Inspect →
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
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)" }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-secondary btn-sm">
            ← Prev
          </button>
          <span style={{ fontSize: "0.875rem", alignSelf: "center" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn btn-secondary btn-sm">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
