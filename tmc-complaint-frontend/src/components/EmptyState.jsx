import { ClipboardList } from "lucide-react";

export function EmptyState({ icon, title, description, actionText, onAction }) {
  return (
    <div
      className="card"
      style={{
        padding: "var(--space-8) var(--space-4)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon || <ClipboardList size={42} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />}
      </div>
      <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>{title}</h3>
      {description && (
        <p style={{ maxWidth: "420px", fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button onClick={onAction} className="btn btn-primary" style={{ marginTop: "var(--space-2)" }}>
          {actionText}
        </button>
      )}
    </div>
  );
}
