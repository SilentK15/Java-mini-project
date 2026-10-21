import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { PriorityBadge } from "../components/PriorityBadge.jsx";
import { ProgressStepper } from "../components/ProgressStepper.jsx";
import { Timeline } from "../components/Timeline.jsx";
import { Skeleton } from "../components/Skeleton.jsx";
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
      <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-1)" }}>
            <span style={{ fontFamily: "monospace", fontSize: "1.125rem", fontWeight: 700, color: "var(--primary-600)" }}>
              {complaint.complaintNumber}
            </span>
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </div>
          <h1 style={{ fontSize: "1.75rem" }}>{complaint.title}</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Reported in <strong>{complaint.location}</strong> • Department: <strong>{complaint.department || "General"}</strong>
          </p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary btn-sm">← Back to List</Link>
      </div>

      {/* Progress Stepper */}
      <ProgressStepper currentStatus={complaint.status} isRejected={isRejected} />

      {/* Description & Evidence photos */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h2 style={{ fontSize: "1.125rem" }}>Issue Details</h2>
        <p style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>{complaint.description}</p>

        {/* Photos */}
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
          {complaint.imageUrl && (
            <div style={{ flex: "1 1 240px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>INITIAL EVIDENCE</div>
              <img src={`${API_ROOT}${complaint.imageUrl}`} alt="Initial Evidence" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }} />
            </div>
          )}
          {complaint.resolutionImageUrl && (
            <div style={{ flex: "1 1 240px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--status-resolved-text)", marginBottom: "4px" }}>RESOLUTION EVIDENCE (WORK DONE)</div>
              <img src={`${API_ROOT}${complaint.resolutionImageUrl}`} alt="Resolution Evidence" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--status-resolved-border)" }} />
            </div>
          )}
        </div>
      </div>

      {/* Staff & Admin Actions */}
      {(isStaff || isAdmin) && !isResolved && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", borderLeft: "4px solid var(--primary-500)" }}>
          <h2 style={{ fontSize: "1.125rem" }}>Staff Actions</h2>
          <form onSubmit={handleUpdateStatus} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <select className="form-select" style={{ flex: "1 1 180px" }} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} required>
                <option value="">-- Change Status --</option>
                <option value="ASSIGNED">Assign to Field Staff</option>
                <option value="IN_PROGRESS">Mark In Progress</option>
                <option value="RESOLVED">Mark Resolved (Upload evidence)</option>
                <option value="REJECTED">Reject Grievance</option>
              </select>
              <input className="form-input" style={{ flex: "2 1 240px" }} placeholder="Reason / resolution notes..." value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
            </div>

            {newStatus === "RESOLVED" && (
              <div className="form-group">
                <label className="form-label">Completion Proof Photo (JPG/PNG)</label>
                <input type="file" accept="image/*" className="form-input" onChange={(e) => setEvidenceFile(e.target.files?.[0])} />
              </div>
            )}

            <button type="submit" disabled={updatingStatus || !newStatus} className="btn btn-primary" style={{ alignSelf: "flex-end" }}>
              {updatingStatus ? "Updating..." : "Submit Status Change"}
            </button>
          </form>
        </div>
      )}

      {/* Citizen Feedback or Appeal if resolved */}
      {isCitizen && isResolved && !complaint.citizenRating && (
        <div className="card" style={{ backgroundColor: "var(--status-resolved-bg)", borderColor: "var(--status-resolved-border)" }}>
          <h3>Citizen Verification & Rating</h3>
          <p style={{ fontSize: "0.875rem", marginBottom: "var(--space-3)" }}>Please rate the resolution quality performed by TMC engineers.</p>
          <form onSubmit={handleFeedback} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button type="button" key={s} className="btn btn-secondary btn-sm" style={{ backgroundColor: rating === s ? "var(--accent-500)" : "var(--bg-surface)", color: rating === s ? "#fff" : "var(--text-primary)" }} onClick={() => setRating(s)}>
                  {"⭐".repeat(s)} ({s})
                </button>
              ))}
            </div>
            <textarea className="form-textarea" rows={2} placeholder="Optional citizen comments..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Submit Rating</button>
          </form>
        </div>
      )}

      {/* Citizen Reopen / Appeal if resolved or rejected */}
      {isCitizen && (isResolved || isRejected) && (
        <div className="card" style={{ backgroundColor: "var(--bg-subtle)" }}>
          <h3 style={{ fontSize: "1rem" }}>Not satisfied with the resolution?</h3>
          <p style={{ fontSize: "0.875rem", marginBottom: "var(--space-3)" }}>
            You can request a re-inspection from the municipal ward supervisor.
          </p>
          <form onSubmit={handleReopen} style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              className="form-input"
              placeholder="State reason for reopening grievance..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
              Request Reopen
            </button>
          </form>
        </div>
      )}

      {/* Internal notes (Staff / Admin only) */}
      {(isStaff || isAdmin) && (
        <div className="card">
          <h2 style={{ fontSize: "1.125rem", marginBottom: "var(--space-3)" }}>Internal Department Notes</h2>
          <form onSubmit={handleAddNote} style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            <input className="form-input" placeholder="Add confidential team note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
            <button type="submit" disabled={submittingNote || !newNote.trim()} className="btn btn-secondary">Add</button>
          </form>
          {notes.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>No internal notes yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {notes.map((n) => (
                <div key={n.id} style={{ padding: "8px 12px", backgroundColor: "var(--bg-subtle)", borderRadius: "var(--radius-sm)", fontSize: "0.875rem" }}>
                  <div>{n.note}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {n.authorRole || "STAFF"} • {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="card">
        <h2 style={{ fontSize: "1.125rem", marginBottom: "var(--space-4)" }}>Grievance Progress Timeline</h2>
        <Timeline items={history} />
      </div>
    </div>
  );
}
