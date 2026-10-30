import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { PriorityBadge } from "../components/PriorityBadge.jsx";
import { ProgressStepper } from "../components/ProgressStepper.jsx";
import { Timeline } from "../components/Timeline.jsx";
import { Skeleton } from "../components/Skeleton.jsx";
import { Star, ArrowLeft, Send, CheckCircle2, AlertTriangle, ShieldCheck, MapPin } from "lucide-react";
import {
  getComplaintById,
  getComplaintHistory,
  getInternalNotes,
  addInternalNote,
  updateComplaintStatus,
  submitFeedback,
  reopenComplaint,
} from "../api/complaints.js";
import { API_ROOT } from "../api/client.js";

export function ComplaintDetail() {
  const { complaintNumber } = useParams();
  const { isStaff, isAdmin, isCitizen } = useAuth();
  const { success, error: toastError } = useToast();

  const [complaint, setComplaint] = useState(null);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Status update
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Citizen rating & reopen
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [reopenReason, setReopenReason] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getComplaintById(complaintNumber);
      setComplaint(data);
      if (data?.id) {
        getComplaintHistory(data.id).then(setHistory).catch(() => {});
        if (isStaff || isAdmin) {
          getInternalNotes(data.id).then(setNotes).catch(() => {});
        }
      }
    } catch (err) {
      toastError(err.message || "Failed to load grievance details");
    } finally {
      setLoading(false);
    }
  }, [complaintNumber, isStaff, isAdmin, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !complaint?.id) return;
    setSubmittingNote(true);
    try {
      await addInternalNote(complaint.id, newNote.trim());
      success("Internal note added.");
      setNewNote("");
      getInternalNotes(complaint.id).then(setNotes);
    } catch (err) {
      toastError(err.message || "Failed to add note.");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!newStatus || !complaint?.id) return;
    setUpdatingStatus(true);
    try {
      await updateComplaintStatus(complaint.id, {
        status: newStatus,
        reason: statusReason,
        resolutionEvidenceFile: evidenceFile,
      });
      success(`Status updated to ${newStatus}`);
      setNewStatus("");
      setStatusReason("");
      setEvidenceFile(null);
      loadData();
    } catch (err) {
      toastError(err.message || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    try {
      await submitFeedback(complaint.id, { rating, feedback: feedbackText });
      success("Feedback recorded. Thank you!");
      loadData();
    } catch (err) {
      toastError(err.message || "Could not record feedback.");
    }
  };

  const handleReopen = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;
    try {
      await reopenComplaint(complaint.id, reopenReason);
      success("Reopen appeal filed. An officer will re-inspect.");
      setReopenReason("");
      loadData();
    } catch (err) {
      toastError(err.message || "Could not file appeal.");
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Skeleton height="36px" width="50%" />
        <Skeleton height="120px" width="100%" />
        <Skeleton height="200px" width="100%" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="card" style={{ maxWidth: "600px", margin: "var(--space-8) auto", textAlign: "center", padding: "var(--space-8)" }}>
        <h2>Grievance Not Found</h2>
        <p style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          Could not find complaint reference {complaintNumber}.
        </p>
        <Link to="/dashboard" className="btn btn-primary">Return to Dashboard</Link>
      </div>
    );
  }

  const isResolved = complaint.status === "RESOLVED";
  const isRejected = complaint.status === "REJECTED";

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--primary-600)",
                backgroundColor: "var(--primary-50)",
                padding: "3px 10px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {complaint.complaintNumber}
            </span>
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </div>

          <h1 style={{ fontSize: "1.625rem", letterSpacing: "-0.02em" }}>{complaint.title}</h1>

          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <MapPin size={14} style={{ color: "var(--primary-600)" }} />
              <strong>{complaint.location}</strong>
            </span>
            <span>&bull;</span>
            <span>Department: <strong>{(complaint.department || "General").replace("_", " ")}</strong></span>
          </div>
        </div>

        <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ height: "36px" }}>
          <ArrowLeft size={15} />
          <span>Back to List</span>
        </Link>
      </div>

      {/* Progress Stepper Card */}
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <ProgressStepper currentStatus={complaint.status} isRejected={isRejected} />
      </div>

      {/* Description & Evidence */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h2 style={{ fontSize: "1.125rem" }}>Issue Description & Evidence</h2>
        <p style={{ fontSize: "0.9375rem", lineHeight: 1.6, color: "var(--text-primary)" }}>
          {complaint.description}
        </p>

        {/* Evidence Photos Grid */}
        {(complaint.imageUrl || complaint.resolutionImageUrl) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-2)" }}>
            {complaint.imageUrl && (
              <div style={{ backgroundColor: "var(--bg-subtle)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Initial Grievance Evidence
                </div>
                <img
                  src={`${API_ROOT}${complaint.imageUrl}`}
                  alt="Initial Evidence"
                  style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "var(--radius-sm)" }}
                />
              </div>
            )}

            {complaint.resolutionImageUrl && (
              <div style={{ backgroundColor: "var(--status-resolved-bg)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--status-resolved-border)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--status-resolved-text)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Work Done Resolution Proof
                </div>
                <img
                  src={`${API_ROOT}${complaint.resolutionImageUrl}`}
                  alt="Resolution Evidence"
                  style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "var(--radius-sm)" }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staff & Admin Actions */}
      {(isStaff || isAdmin) && !isResolved && (
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            borderLeft: "4px solid var(--primary-600)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={18} style={{ color: "var(--primary-600)" }} />
            <h2 style={{ fontSize: "1.125rem" }}>Staff Redressal Action Panel</h2>
          </div>

          <form onSubmit={handleUpdateStatus} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-3)" }}>
              <select
                className="form-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                required
                style={{ height: "42px" }}
              >
                <option value="">-- Change Status --</option>
                <option value="ASSIGNED">Assign to Field Squad</option>
                <option value="IN_PROGRESS">Mark In Progress</option>
                <option value="RESOLVED">Mark Resolved (Attach completion photo)</option>
                <option value="REJECTED">Reject Grievance</option>
              </select>

              <input
                className="form-input"
                placeholder="Reason or field notes..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                style={{ height: "42px" }}
              />
            </div>

            {newStatus === "RESOLVED" && (
              <div className="form-group animate-fade-in" style={{ marginTop: "4px" }}>
                <label className="form-label">Completion Proof Photo (Required for SLA Verification)</label>
                <input type="file" accept="image/*" className="form-input" onChange={(e) => setEvidenceFile(e.target.files?.[0])} />
              </div>
            )}

            <button
              type="submit"
              disabled={updatingStatus || !newStatus}
              className="btn btn-primary"
              style={{ alignSelf: "flex-end", height: "40px" }}
            >
              {updatingStatus ? "Updating Status..." : "Submit Status Change"}
            </button>
          </form>
        </div>
      )}

      {/* Citizen Feedback or Appeal if resolved */}
      {isCitizen && isResolved && !complaint.citizenRating && (
        <div className="card" style={{ backgroundColor: "var(--status-resolved-bg)", borderColor: "var(--status-resolved-border)", padding: "var(--space-6)" }}>
          <h3 style={{ fontSize: "1.125rem", color: "var(--status-resolved-text)" }}>Citizen Verification & Rating</h3>
          <p style={{ fontSize: "0.875rem", marginBottom: "var(--space-4)", color: "var(--text-secondary)" }}>
            Please verify the quality of municipal work completed by TMC field engineers.
          </p>

          <form onSubmit={handleFeedback} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: rating === s ? "var(--accent-500)" : "var(--bg-surface)",
                    color: rating === s ? "#ffffff" : "var(--text-primary)",
                    border: rating === s ? "1px solid var(--accent-600)" : "1px solid var(--border-default)",
                    height: "34px",
                  }}
                  onClick={() => setRating(s)}
                >
                  <Star size={14} fill={rating === s ? "#ffffff" : "none"} />
                  <span>{s} {s === 1 ? "Star" : "Stars"}</span>
                </button>
              ))}
            </div>

            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Optional citizen feedback comments..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />

            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", height: "38px" }}>
              Submit Rating & Verify
            </button>
          </form>
        </div>
      )}

      {/* Citizen Reopen appeal if resolved or rejected */}
      {isCitizen && (isResolved || isRejected) && (
        <div className="card" style={{ backgroundColor: "var(--bg-subtle)", padding: "var(--space-5)" }}>
          <h3 style={{ fontSize: "1rem" }}>Not satisfied with the resolution?</h3>
          <p style={{ fontSize: "0.875rem", marginBottom: "var(--space-3)", color: "var(--text-secondary)" }}>
            You can request an escalation re-inspection from the municipal ward supervisor.
          </p>

          <form onSubmit={handleReopen} style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              className="form-input"
              placeholder="State reason why issue is unresolved..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              required
              style={{ height: "40px" }}
            />
            <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0, height: "40px" }}>
              Request Reopen
            </button>
          </form>
        </div>
      )}

      {/* Internal notes (Staff / Admin) */}
      {(isStaff || isAdmin) && (
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <h2 style={{ fontSize: "1.125rem", marginBottom: "var(--space-3)" }}>Internal Department Notes</h2>

          <form onSubmit={handleAddNote} style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            <input
              className="form-input"
              placeholder="Add confidential team note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{ height: "40px" }}
            />
            <button
              type="submit"
              disabled={submittingNote || !newNote.trim()}
              className="btn btn-secondary"
              style={{ height: "40px" }}
            >
              Add
            </button>
          </form>

          {notes.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>No internal notes added yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {notes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "10px 14px",
                    backgroundColor: "var(--bg-subtle)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.875rem",
                  }}
                >
                  <div>{n.note}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    {n.authorRole || "STAFF"} &bull; {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="card" style={{ padding: "var(--space-6)" }}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "var(--space-4)" }}>Grievance Progress Audit Trail</h2>
        <Timeline items={history} />
      </div>
    </div>
  );
}
