import { useEffect, useState } from "react";
import "./PublicTrackerModal.css";
import {
  Landmark,
  X,
  AlertCircle,
  Building2,
  Lock,
  MapPin,
  Calendar,
  Clock,
  ClipboardList,
  FilePlus,
  Truck,
  Trash2,
  Droplet,
  Zap,
  Lightbulb,
  Waves,
  FileText,
} from "lucide-react";

function getCategoryIcon(cat) {
  switch (cat) {
    case "ROAD": return <Truck size={14} />;
    case "GARBAGE": return <Trash2 size={14} />;
    case "WATER": return <Droplet size={14} />;
    case "ELECTRICITY": return <Zap size={14} />;
    case "STREET_LIGHT": return <Lightbulb size={14} />;
    case "DRAINAGE": return <Waves size={14} />;
    default: return <FileText size={14} />;
  }
}

export function PublicTrackerModal({
  complaintNumber = "",
  apiRoot = "",
  uiCopy = {},
  onClose,
  onNavigateAuth,
}) {
  const [currentRef, setCurrentRef] = useState(complaintNumber?.trim() || "");
  const [inputRef, setInputRef] = useState(complaintNumber?.trim() || "");
  const [loading, setLoading] = useState(Boolean(complaintNumber?.trim()));
  const [error, setError] = useState("");
  const [complaint, setComplaint] = useState(null);

  useEffect(() => {
    if (complaintNumber?.trim()) {
      setCurrentRef(complaintNumber.trim());
      setInputRef(complaintNumber.trim());
    }
  }, [complaintNumber]);

  useEffect(() => {
    if (!currentRef?.trim()) {
      setLoading(false);
      setComplaint(null);
      setError("");
      return;
    }
    let isCurrent = true;

    const fetchTracking = async () => {
      setLoading(true);
      setError("");
      try {
        const cleanRef = encodeURIComponent(currentRef.trim());
        const res = await fetch(`${apiRoot}/api/complaints/public/track/${cleanRef}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(uiCopy.trackingNotFound || `No grievance found with reference: ${currentRef.trim()}`);
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
  }, [currentRef, apiRoot, uiCopy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputRef.trim()) {
      setCurrentRef(inputRef.trim());
    }
  };

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
            <span className="tracker-header-icon" style={{ display: "inline-flex", alignItems: "center", color: "var(--primary-600)" }}>
              <Landmark size={22} />
            </span>
            <div>
              <h2 id="tracker-title">{uiCopy.trackingModalTitle || "Public Grievance Status & Timeline"}</h2>
              <p>Thane Municipal Corporation · Citizen Redressal Portal</p>
            </div>
          </div>
          <button type="button" className="tracker-close-btn" onClick={onClose} aria-label="Close" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
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

          {!loading && !complaint && (
            <div style={{ padding: "var(--space-6) var(--space-4)", textAlign: "center" }}>
              <div style={{ maxWidth: "460px", margin: "0 auto" }}>
                <h3 style={{ fontSize: "1.125rem", marginBottom: "8px" }}>Track Grievance Redressal</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
                  Enter your municipal grievance reference number to inspect verified field dispatch and timeline progress.
                </p>
                <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. TMC-2026-000006"
                    value={inputRef}
                    onChange={(e) => setInputRef(e.target.value)}
                    style={{ flex: 1, height: "42px" }}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary" style={{ height: "42px", padding: "0 18px" }}>
                    Track
                  </button>
                </form>
                {error && (
                  <div style={{ marginTop: "14px", padding: "10px 14px", backgroundColor: "var(--status-rejected-bg)", color: "var(--status-rejected-text)", borderRadius: "var(--radius-md)", fontSize: "0.8125rem" }}>
                    {error}
                  </div>
                )}
                <div style={{ marginTop: "14px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Reference IDs follow standard municipal format: <code>TMC-YYYY-XXXXXX</code>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && complaint && (
            <div className="tracker-content-layout">
              {/* Reference ID Banner */}
              <div className="tracker-ref-banner">
                <div className="tracker-ref-left">
                  <span className="tracker-ref-badge">{complaint.complaintNumber}</span>
                  <span className="tracker-category-pill" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {getCategoryIcon(complaint.category)} {complaint.category}
                  </span>
                  {complaint.department && (
                    <span className="tracker-dept-pill" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Building2 size={13} /> {complaint.department.replace(/_/g, " ")}
                    </span>
                  )}
                  {complaint.priority && (
                    <span className={`priority-badge priority-${complaint.priority.toLowerCase()}`}>
                      {complaint.priority}
                    </span>
                  )}
                </div>
                <div className="tracker-ref-right" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`tracker-status-badge status-${complaint.status?.toLowerCase()}`}>
                    {complaint.status === "IN_PROGRESS"
                      ? (uiCopy.inProgress || "In Progress")
                      : complaint.status === "RESOLVED"
                      ? (uiCopy.resolved || "Resolved")
                      : complaint.status === "REOPEN_REQUESTED"
                      ? (uiCopy.statusReopenRequested || "Reopen Requested")
                      : (uiCopy.submitted || "Submitted")}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setComplaint(null); setCurrentRef(""); setInputRef(""); }}
                    style={{ height: "28px", fontSize: "0.75rem", padding: "0 8px" }}
                  >
                    Search Other #
                  </button>
                </div>
              </div>

              {/* Title & Approximate Location */}
              <div className="tracker-summary-card">
                <h3 className="tracker-complaint-title">{complaint.title}</h3>
                <div className="tracker-privacy-notice" style={{ fontSize: "0.82rem", color: "#6b7280", margin: "6px 0 12px 0", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <Lock size={12} />
                  <span>Redacted for public view · Detailed information restricted to authorized users</span>
                </div>
                <div className="tracker-meta-row">
                  <div className="tracker-meta-item">
                    <span className="tracker-meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={13} />
                      {uiCopy.trackingLocationWard || "Location / Ward"}:
                    </span>
                    <strong>{complaint.location}</strong>
                  </div>
                  <div className="tracker-meta-item">
                    <span className="tracker-meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={13} />
                      Lodged:
                    </span>
                    <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                  </div>
                  {complaint.slaDueAt && (
                    <div className="tracker-meta-item">
                      <span className="tracker-meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={13} />
                        {uiCopy.trackingSlaStatus || "SLA Target"}:
                      </span>
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
                <h4 style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <ClipboardList size={16} />
                  <span>{uiCopy.trackingTimelineTitle || "Official Action Taken & Progress Timeline"}</span>
                </h4>
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
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    onClick={() => {
                      onClose();
                      onNavigateAuth();
                    }}
                  >
                    <FilePlus size={15} />
                    <span>Lodge a New Grievance</span>
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
