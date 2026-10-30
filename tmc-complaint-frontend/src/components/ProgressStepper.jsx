import { XCircle, Check } from "lucide-react";

const STEPS = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "RESOLVED", label: "Resolved" },
];

export function ProgressStepper({ currentStatus, isRejected = false }) {
  const getStepIndex = (status) => {
    switch (status) {
      case "SUBMITTED": return 0;
      case "ASSIGNED": return 1;
      case "IN_PROGRESS": return 2;
      case "RESOLVED": return 3;
      default: return 0;
    }
  };

  const currentIndex = isRejected ? -1 : getStepIndex(currentStatus);

  if (isRejected) {
    return (
      <div className="card" style={{ padding: "var(--space-4)", backgroundColor: "var(--status-rejected-bg)", borderColor: "var(--status-rejected-border)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <XCircle size={28} style={{ color: "var(--status-rejected-text)", flexShrink: 0 }} />
        <div>
          <h4 style={{ color: "var(--status-rejected-text)" }}>Complaint Rejected</h4>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            This grievance could not be processed. Please check timeline notes for administrative reasons.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card stepper-container" style={{ padding: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
        {/* Progress bar background line */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "5%",
            right: "5%",
            height: "3px",
            backgroundColor: "var(--border-default)",
            zIndex: 1,
          }}
        />
        {/* Progress bar active line */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "5%",
            width: `${(currentIndex / (STEPS.length - 1)) * 90}%`,
            height: "3px",
            backgroundColor: "var(--primary-600)",
            zIndex: 2,
            transition: "width 0.4s ease",
          }}
        />

        {STEPS.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                zIndex: 3,
                width: "25%",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: isDone ? "var(--primary-600)" : "var(--bg-surface)",
                  border: `2px solid ${isDone ? "var(--primary-600)" : "var(--border-default)"}`,
                  color: isDone ? "#ffffff" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  transition: "all 0.3s ease",
                  boxShadow: isCurrent ? "0 0 0 4px var(--primary-100)" : "none",
                }}
              >
                {isDone ? <Check size={14} strokeWidth={3} /> : idx + 1}
              </div>
              <span
                style={{
                  marginTop: "var(--space-2)",
                  fontSize: "0.8125rem",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? "var(--primary-700)" : isDone ? "var(--text-primary)" : "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
