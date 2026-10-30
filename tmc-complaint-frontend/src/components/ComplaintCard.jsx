import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge.jsx";
import { PriorityBadge } from "./PriorityBadge.jsx";
import { MapPin, AlertTriangle, Calendar, ChevronRight } from "lucide-react";

export function ComplaintCard({ complaint }) {
  const number = complaint.complaintNumber || `TMC-#${complaint.id}`;
  const dateStr = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const isHighPriority = complaint.priority === "HIGH";

  return (
    <div
      className="card card-hover complaint-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        position: "relative",
        borderLeft: isHighPriority ? "4px solid #ef4444" : "4px solid var(--primary-500)",
        padding: "var(--space-5)",
      }}
    >
      {/* Top Meta row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            fontSize: "0.8125rem",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            color: "var(--primary-600)",
            backgroundColor: "var(--primary-50)",
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            letterSpacing: "-0.01em",
          }}
        >
          {number}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      {/* Main Title & Description */}
      <div>
        <h3
          style={{
            fontSize: "1.0625rem",
            fontWeight: 700,
            marginBottom: "var(--space-1)",
            lineHeight: 1.35,
          }}
        >
          <Link
            to={`/complaints/${number}`}
            style={{
              color: "var(--text-primary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>{complaint.title}</span>
          </Link>
        </h3>
        <p
          style={{
            fontSize: "0.84375rem",
            color: "var(--text-secondary)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.5,
          }}
        >
          {complaint.description}
        </p>
      </div>

      {/* SLA Alert if applicable */}
      {complaint.overdue && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--status-rejected-text)",
            backgroundColor: "var(--status-rejected-bg)",
            border: "1px solid var(--status-rejected-border)",
            borderRadius: "var(--radius-sm)",
            padding: "3px 8px",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            width: "fit-content",
          }}
        >
          <AlertTriangle size={12} />
          <span>SLA Overdue — Escalated to Ward Supervisor</span>
        </div>
      )}

      {/* Card Footer */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "var(--space-3)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.78125rem",
          color: "var(--text-muted)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            maxWidth: "60%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={complaint.location}
        >
          <MapPin size={13} style={{ flexShrink: 0, color: "var(--primary-600)" }} />
          <span>{complaint.location || "Thane Municipal Area"}</span>
        </span>

        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <Calendar size={13} />
          <span>{dateStr}</span>
        </span>
      </div>
    </div>
  );
}
