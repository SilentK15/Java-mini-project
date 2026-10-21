import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge.jsx";
import { PriorityBadge } from "./PriorityBadge.jsx";

export function ComplaintCard({ complaint }) {
  const number = complaint.complaintNumber || `TMC-#${complaint.id}`;
  const dateStr = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="card card-hover complaint-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <span style={{ fontSize: "0.8125rem", fontFamily: "monospace", fontWeight: 700, color: "var(--primary-600)" }}>
          {number}
        </span>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "var(--space-1)" }}>
          <Link to={`/complaints/${number}`} style={{ color: "var(--text-primary)" }}>
            {complaint.title}
          </Link>
        </h3>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {complaint.description}
        </p>
      </div>

      <div style={{ marginTop: "auto", paddingTop: "var(--space-2)", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
        <span>📍 {complaint.location || "Thane Municipal Area"}</span>
        <span>{dateStr}</span>
      </div>

      {complaint.overdue && (
        <div style={{ fontSize: "0.75rem", color: "var(--status-rejected-text)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
          ⚠️ SLA Overdue
        </div>
      )}
    </div>
  );
}
