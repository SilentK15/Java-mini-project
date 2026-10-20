import { useEffect, useState } from "react";
import "./PublicTrackerModal.css";

const CATEGORY_ICONS = {
  ROAD: "🚧",
  GARBAGE: "🗑️",
  WATER: "🚰",
  ELECTRICITY: "⚡",
  STREET_LIGHT: "💡",
  DRAINAGE: "🕳️",
  OTHER: "📋",
};

export function PublicTrackerModal({
  complaintNumber,
  apiRoot,
  uiCopy = {},
  onClose,
  onNavigateAuth,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [complaint, setComplaint] = useState(null);

  useEffect(() => {
    if (!complaintNumber) return;
    let isCurrent = true;

    const fetchTracking = async () => {
      setLoading(true);
      setError("");
      try {
        const cleanRef = encodeURIComponent(complaintNumber.trim());
        const res = await fetch(`${apiRoot}/api/complaints/public/track/${cleanRef}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(uiCopy.trackingNotFound || "No grievance found with this reference number.");
          }
          throw new Error("Unable to retrieve grievance status. Please try again later.");
        }
        const data = await res.json();
        if (isCurrent) setComplaint(data);
      } catch (err) {
        if (isCurrent) setError(err.message || "Unable to retrieve status.");
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchTracking();
    return () => {
      isCurrent = false;
    };
  }, [complaintNumber, apiRoot, uiCopy]);

  const getStatusStepIndex = (status) => {
    switch (status) {
      case "SUBMITTED":
        return 0;
      case "IN_PROGRESS":
        return 1;
      case "RESOLVED":
        return 2;
      case "REOPEN_REQUESTED":
        return 1;
      default:
        return 0;
    }
  };

  return (
    <div className="tracker-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tracker-modal" role="dialog" aria-modal="true" aria-labelledby="tracker-title">
        {/* Modal Header */}
        <div className="tracker-modal-header">
          <div className="tracker-header-title">
            <span className="tracker-header-icon">🏛️</span>
            <div>
              <h2 id="tracker-title">{uiCopy.trackingModalTitle || "Public Grievance Status & Timeline"}</h2>
              <p>Thane Municipal Corporation · Citizen Redressal Portal</p>
            </div>
          </div>
          <button type="button" className="tracker-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="tracker-modal-body">
          {loading && (
            <div className="tracker-loading-state">
              <div className="tracker-spinner"></div>
              <p>{uiCopy.loadingUpdates || "Verifying municipal records..."}</p>
            </div>
          )}

          {error && (
            <div className="tracker-error-state">
              <span className="tracker-error-icon">⚠️</span>
              <h3>Grievance Not Found</h3>
              <p>{error}</p>
              <div className="tracker-search-hint">
                <small>Tip: Grievance IDs usually follow the format <code>TMC-YYYY-XXXXXX</code>.</small>
              </div>
              <button type="button" className="tracker-btn-primary" onClick={onClose}>
                Try Another Reference #
              </button>
            </div>
          )}

          {!loading && !error && complaint && (
            <div className="tracker-content-layout">
              {/* Reference ID Banner */}
              <div className="tracker-ref-banner">
                <div className="tracker-ref-left">
                  <span className="tracker-ref-badge">{complaint.complaintNumber}</span>
                  <span className="tracker-category-pill">
                    {CATEGORY_ICONS[complaint.category] || "📋"} {complaint.category}
                  </span>
                  {complaint.department && (
                    <span className="tracker-dept-pill">
                      🏢 {complaint.department.replace(/_/g, " ")}
                    </span>
                  )}
                  {complaint.priority && (
                    <span className={`priority-badge priority-${complaint.priority.toLowerCase()}`}>
                      {complaint.priority}
                    </span>
                  )}
                </div>
                <div className="tracker-ref-right">
                  <span className={`tracker-status-badge status-${complaint.status?.toLowerCase()}`}>
                    {complaint.status === "IN_PROGRESS"
                      ? (uiCopy.inProgress || "In Progress")
                      : complaint.status === "RESOLVED"
                      ? (uiCopy.resolved || "Resolved")
                      : complaint.status === "REOPEN_REQUESTED"
                      ? (uiCopy.statusReopenRequested || "Reopen Requested")
                      : (uiCopy.submitted || "Submitted")}
                  </span>
                </div>
              </div>

              {/* Title & Approximate Location */}
              <div className="tracker-summary-card">
                <h3 className="tracker-complaint-title">{complaint.title}</h3>
                <div className="tracker-privacy-notice" style={{ fontSize: "0.82rem", color: "#6b7280", margin: "6px 0 12px 0" }}>
                  <span>🔒 Redacted for public view · Detailed information restricted to authorized users</span>
                </div>
                <div className="tracker-meta-row">
                  <div className="tracker-meta-item">
                    <span className="tracker-meta-label">📍 {uiCopy.trackingLocationWard || "Location / Ward"}:</span>
                    <strong>{complaint.location}</strong>
                  </div>
                  <div className="tracker-meta-item">
                    <span className="tracker-meta-label">📅 Lodged:</span>
                    <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                  </div>
                  {complaint.slaDueAt && (
                    <div className="tracker-meta-item">
                      <span className="tracker-meta-label">⏱️ {uiCopy.trackingSlaStatus || "SLA Target"}:</span>
                      <span className={`sla-indicator ${complaint.overdue ? "overdue" : "ontrack"}`}>
                        {complaint.overdue ? (uiCopy.trackingOverdue || "Overdue") : (uiCopy.trackingOnTrack || "Within Mandated SLA")}
                        {" · Due " + new Date(complaint.slaDueAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3-Step Visual Progress Bar */}
              <div className="tracker-stepper-box">
                <h4>Progress Milestones</h4>
                <div className="tracker-stepper">
                  <div className={`step-node ${getStatusStepIndex(complaint.status) >= 0 ? "active" : ""}`}>
                    <div className="step-circle">1</div>
                    <span className="step-label">{uiCopy.trackingStepSubmitted || "Submitted"}</span>
                    <span className="step-date">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className={`step-connector ${getStatusStepIndex(complaint.status) >= 1 ? "active" : ""}`} />
                  <div className={`step-node ${getStatusStepIndex(complaint.status) >= 1 ? "active" : ""}`}>
                    <div className="step-circle">2</div>
                    <span className="step-label">{uiCopy.trackingStepInProgress || "Action in Progress"}</span>
                    <span className="step-date">
                      {complaint.status !== "SUBMITTED" ? "Staff Dispatched" : "Pending Queue"}
                    </span>
                  </div>
                  <div className={`step-connector ${getStatusStepIndex(complaint.status) >= 2 ? "active" : ""}`} />
                  <div className={`step-node ${getStatusStepIndex(complaint.status) >= 2 ? "active" : ""}`}>
                    <div className="step-circle">3</div>
                    <span className="step-label">{uiCopy.trackingStepResolved || "Resolved & ATR"}</span>
                    <span className="step-date">
                      {complaint.status === "RESOLVED" ? "Completed" : "Awaiting Resolution"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Official Status Timeline */}
              <div className="tracker-timeline-section">
                <h4>📋 {uiCopy.trackingTimelineTitle || "Official Action Taken & Progress Timeline"}</h4>
                {complaint.timeline && complaint.timeline.length > 0 ? (
                  <div className="tracker-timeline-flow">
                    {complaint.timeline.map((step, idx) => (
                      <div key={step.id || idx} className="tracker-timeline-item">
                        <div className="timeline-marker-dot" />
                        <div className="timeline-item-content">
                          <div className="timeline-top-row">
                            <span className={`timeline-tag status-${step.newStatus?.toLowerCase()}`}>
                              {step.newStatus}
                            </span>
                            <span className="timeline-timestamp">
                              {new Date(step.changedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="timeline-reason">{step.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="tracker-no-updates">Grievance registered in municipal intake queue.</p>
                )}
              </div>

              {/* Footer actions */}
              <div className="tracker-footer-actions">
                <button type="button" className="tracker-btn-secondary" onClick={onClose}>
                  {uiCopy.trackingClose || "Close Tracker"}
                </button>
                {onNavigateAuth && (
                  <button
                    type="button"
                    className="tracker-btn-primary"
                    onClick={() => {
                      onClose();
                      onNavigateAuth();
                    }}
                  >
                    📝 Lodge a New Grievance
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
