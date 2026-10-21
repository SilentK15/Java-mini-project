export function Timeline({ items = [] }) {
  if (!items || items.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No timeline events recorded yet.</p>;
  }

  return (
    <div className="timeline-container" style={{ position: "relative", paddingLeft: "var(--space-6)" }}>
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          bottom: "8px",
          left: "9px",
          width: "2px",
          backgroundColor: "var(--border-default)",
        }}
      />

      {items.map((item, index) => {
        const dateStr = item.changedAt
          ? new Date(item.changedAt).toLocaleString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <div
            key={item.id || index}
            style={{
              position: "relative",
              marginBottom: "var(--space-4)",
            }}
          >
            {/* Dot */}
            <div
              style={{
                position: "absolute",
                left: `calc(-1 * var(--space-6) + 4px)`,
                top: "4px",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "var(--primary-600)",
                border: "2px solid var(--bg-surface)",
              }}
            />

            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                  {item.previousStatus ? `${item.previousStatus} → ${item.newStatus}` : item.newStatus}
                </strong>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{dateStr}</span>
              </div>
              {item.reason && (
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
                  {item.reason}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
