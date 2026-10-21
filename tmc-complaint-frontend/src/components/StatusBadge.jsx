export function StatusBadge({ status }) {
  const normalized = (status || "SUBMITTED").toUpperCase();

  const styles = {
    SUBMITTED: {
      bg: "var(--status-submitted-bg)",
      text: "var(--status-submitted-text)",
      border: "var(--status-submitted-border)",
      label: "Submitted",
      dot: "#3b82f6",
    },
    ASSIGNED: {
      bg: "var(--status-assigned-bg)",
      text: "var(--status-assigned-text)",
      border: "var(--status-assigned-border)",
      label: "Assigned",
      dot: "#8b5cf6",
    },
    IN_PROGRESS: {
      bg: "var(--status-progress-bg)",
      text: "var(--status-progress-text)",
      border: "var(--status-progress-border)",
      label: "In Progress",
      dot: "#f59e0b",
    },
    RESOLVED: {
      bg: "var(--status-resolved-bg)",
      text: "var(--status-resolved-text)",
      border: "var(--status-resolved-border)",
      label: "Resolved",
      dot: "#10b981",
    },
    REJECTED: {
      bg: "var(--status-rejected-bg)",
      text: "var(--status-rejected-text)",
      border: "var(--status-rejected-border)",
      label: "Rejected",
      dot: "#ef4444",
    },
  };

  const current = styles[normalized] || styles.SUBMITTED;

  return (
    <span
      className="badge status-badge"
      style={{
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: current.dot,
          display: "inline-block",
        }}
      />
      {current.label}
    </span>
  );
}
