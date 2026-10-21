import { useToast } from "../hooks/useToast.js";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  const typeStyles = {
    success: {
      bg: "var(--status-resolved-bg)",
      text: "var(--status-resolved-text)",
      border: "var(--status-resolved-border)",
      icon: "✓",
    },
    error: {
      bg: "var(--status-rejected-bg)",
      text: "var(--status-rejected-text)",
      border: "var(--status-rejected-border)",
      icon: "✕",
    },
    warning: {
      bg: "var(--status-progress-bg)",
      text: "var(--status-progress-text)",
      border: "var(--status-progress-border)",
      icon: "⚠️",
    },
    info: {
      bg: "var(--status-submitted-bg)",
      text: "var(--status-submitted-text)",
      border: "var(--status-submitted-border)",
      icon: "ℹ",
    },
  };

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "var(--space-6)",
        right: "var(--space-6)",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        maxWidth: "380px",
        width: "calc(100% - 32px)",
      }}
    >
      {toasts.map((toast) => {
        const style = typeStyles[toast.type] || typeStyles.info;
        return (
          <div
            key={toast.id}
            className="animate-fade-in"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: style.bg,
              color: style.text,
              border: `1px solid ${style.border}`,
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span>{style.icon}</span>
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: "none",
                border: "none",
                color: style.text,
                cursor: "pointer",
                padding: "2px 6px",
                fontSize: "0.875rem",
                fontWeight: 700,
              }}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
