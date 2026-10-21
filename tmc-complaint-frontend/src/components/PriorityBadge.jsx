export function PriorityBadge({ priority }) {
  const normalized = (priority || "MEDIUM").toUpperCase();

  const styles = {
    LOW: {
      bg: "var(--priority-low-bg)",
      text: "var(--priority-low-text)",
      label: "Low Priority",
    },
    MEDIUM: {
      bg: "var(--priority-medium-bg)",
      text: "var(--priority-medium-text)",
      label: "Medium Priority",
    },
    HIGH: {
      bg: "var(--priority-high-bg)",
      text: "var(--priority-high-text)",
      label: "High Priority",
    },
  };

  const current = styles[normalized] || styles.MEDIUM;

  return (
    <span
      className="badge priority-badge"
      style={{
        backgroundColor: current.bg,
        color: current.text,
      }}
    >
      {current.label}
    </span>
  );
}
