import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { getDepartmentAnalytics, exportComplaintsCsv } from "../api/admin.js";
import { getComplaints, updateComplaintStatus } from "../api/complaints.js";
import { normalizeDepartmentAnalytics } from "../departmentAnalytics.js";
import { WardMapView } from "../WardMapView.jsx";
import { PriorityBadge } from "../components/PriorityBadge.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useToast } from "../hooks/useToast.js";
import { Skeleton, CardSkeleton } from "../components/Skeleton.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import {
  Download,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  FileCheck,
  X,
  AlertTriangle,
  Layers,
} from "lucide-react";

export function AdminDashboard() {
  const { success, error: toastError } = useToast();
  const [analytics, setAnalytics] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters for Live Tickets Queue
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolutionReason, setResolutionReason] = useState("");
  const [resolving, setResolving] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [analyticsData, complaintsData] = await Promise.all([
        getDepartmentAnalytics().catch(() => []),
        getComplaints({ page: 0, size: 200 }).catch(() => ({ complaints: [] })),
      ]);
      const normalized = normalizeDepartmentAnalytics(analyticsData);
      setAnalytics(normalized);
      const list = Array.isArray(complaintsData)
        ? complaintsData
        : Array.isArray(complaintsData?.complaints)
        ? complaintsData.complaints
        : Array.isArray(complaintsData?.content)
        ? complaintsData.content
        : [];
      setComplaints(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await exportComplaintsCsv();
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tmc_civic_complaints_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      success("Grievance CSV exported successfully.");
    } catch (err) {
      toastError(err.message || "Failed to export CSV.");
    } finally {
      setExporting(false);
    }
  };

  const handleOpenResolveModal = (complaint) => {
    setSelectedComplaint(complaint);
    setResolutionReason(
      complaint.category === "ROAD"
        ? "Inspected on-site and asphalt road surface repaired by PWD squad. Issue resolved."
        : "Field team inspected and completed municipal redressal work. Verified by ward engineer."
    );
    setResolveModalOpen(true);
  };

  const handleConfirmResolve = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!resolutionReason.trim()) {
      toastError("Please enter resolution remarks / action taken report.");
      return;
    }

    setResolving(true);
    try {
      await updateComplaintStatus(selectedComplaint.id, {
        status: "RESOLVED",
        reason: resolutionReason.trim(),
      });
      success(
        `Ticket ${selectedComplaint.complaintNumber} marked as Resolved! Citizen has been notified.`
      );
      setResolveModalOpen(false);
      setSelectedComplaint(null);
      setResolutionReason("");
      await loadDashboardData();
    } catch (err) {
      toastError(err.message || "Failed to resolve complaint.");
    } finally {
      setResolving(false);
    }
  };

  // Real KPI Metrics derived directly from database records
  const counts = {
    total: complaints.length,
    submitted: complaints.filter((c) => c.status === "SUBMITTED").length,
    inProgress: complaints.filter((c) => c.status === "IN_PROGRESS" || c.status === "ASSIGNED").length,
    resolved: complaints.filter((c) => c.status === "RESOLVED").length,
  };

  // Real Bar Chart Data (only departments with actual complaints)
  const realDepartmentData = analytics
    .filter((a) => a.total > 0 && a.department !== "UNASSIGNED")
    .map((a) => ({
      name: a.department.replace(/_/g, " "),
      Submitted: a.submitted,
      "In Progress": a.inProgress,
      Resolved: a.resolved,
    }));

  // Real Category Distribution Chart Data (counted directly from real complaints array)
  const categoryCountMap = complaints.reduce((acc, c) => {
    const cat = c.category || "OTHER";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const realCategoryChartData = Object.entries(categoryCountMap).map(([cat, total]) => ({
    name: cat.replace(/_/g, " "),
    Grievances: total,
  }));

  // Filter complaints for the Live Tickets Table
  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchNum = (c.complaintNumber || "").toLowerCase().includes(q);
      const matchTitle = (c.title || "").toLowerCase().includes(q);
      const matchLoc = (c.location || "").toLowerCase().includes(q);
      if (!matchNum && !matchTitle && !matchLoc) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Skeleton height="36px" width="300px" />
        <Skeleton height="100px" width="100%" />
        <Skeleton height="280px" width="100%" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--primary-600)",
                backgroundColor: "var(--primary-50)",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              Executive Console
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>TMC Civic Administration & Redressal</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", marginTop: "2px" }}>
            Oversee, resolve, and close citizen grievances across all Thane municipal wards
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="btn btn-secondary"
            style={{ height: "40px" }}
          >
            <Download size={16} />
            <span>{exporting ? "Generating CSV..." : "Export CSV"}</span>
          </button>
          <Link to="/admin/staff" className="btn btn-primary" style={{ height: "40px" }}>
            <Users size={16} />
            <span>Manage Staff Accounts</span>
          </Link>
        </div>
      </div>

      {/* Live Real Metric Cards */}
      <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="stat-widget primary">
          <div className="stat-title">Total Lodged Tickets</div>
          <div className="stat-num" style={{ color: "var(--primary-600)" }}>{counts.total}</div>
          <div className="stat-sub">Across all municipal categories</div>
        </div>

        <div className="stat-widget warning">
          <div className="stat-title">Pending Review / Open</div>
          <div className="stat-num" style={{ color: "#d97706" }}>{counts.submitted}</div>
          <div className="stat-sub">Awaiting field action / closure</div>
        </div>

        <div className="stat-widget info">
          <div className="stat-title">In Progress / Assigned</div>
          <div className="stat-num" style={{ color: "#3b82f6" }}>{counts.inProgress}</div>
          <div className="stat-sub">Dispatched to ward squads</div>
        </div>

        <div className="stat-widget success">
          <div className="stat-title">Resolved & Closed</div>
          <div className="stat-num" style={{ color: "var(--success-600)" }}>{counts.resolved}</div>
          <div className="stat-sub">Citizens notified with ATR</div>
        </div>
      </div>

      {/* LIVE CITIZEN GRIEVANCE MANAGEMENT QUEUE */}
      <div className="card" style={{ padding: "var(--space-6)", boxShadow: "var(--shadow-sm)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-4)",
            marginBottom: "var(--space-4)",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.25rem", letterSpacing: "-0.01em" }}>
              Citizen Grievance Redressal Queue
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Review citizen-submitted complaints, inspect evidence, and mark resolved to close tickets.
            </p>
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--primary-600)",
                backgroundColor: "var(--primary-50)",
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
              }}
            >
              {filteredComplaints.length} tickets shown
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-4)",
            padding: "var(--space-3)",
            backgroundColor: "var(--bg-subtle)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 260px", position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by ticket #, issue title, or area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "36px", height: "38px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ width: "auto", height: "38px", fontSize: "0.8125rem" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted (Pending)</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved (Closed)</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="form-select"
              style={{ width: "auto", height: "38px", fontSize: "0.8125rem" }}
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Complaints Table */}
        {filteredComplaints.length === 0 ? (
          <EmptyState
            title="No tickets found"
            description="No citizen grievances match your current search or filter criteria."
          />
        ) : (
          <div className="table-container shadow-xs" style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket Ref</th>
                  <th>Grievance & Location</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Lodged</th>
                  <th style={{ textAlign: "right" }}>Redressal Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id || c.complaintNumber}>
                    <td
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                      }}
                    >
                      <Link
                        to={`/complaints/${c.complaintNumber || c.id}`}
                        style={{ color: "var(--primary-600)", textDecoration: "none" }}
                        title="Inspect Ticket Details"
                      >
                        {c.complaintNumber}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.title}</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          marginTop: "2px",
                        }}
                      >
                        <MapPin size={12} style={{ color: "var(--primary-600)" }} />
                        <span>{c.location || "Thane Municipal Area"}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {c.department ? c.department.replace(/_/g, " ") : "Public Works"}
                      </span>
                    </td>
                    <td>
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        {c.status !== "RESOLVED" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(c)}
                            className="btn btn-primary btn-sm"
                            style={{
                              backgroundColor: "#16a34a",
                              borderColor: "#16a34a",
                              height: "32px",
                              padding: "0 10px",
                              gap: "5px",
                            }}
                            title="Resolve this grievance and notify citizen"
                          >
                            <CheckCircle2 size={14} />
                            <span>Resolve</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "#16a34a",
                              backgroundColor: "#dcfce7",
                              padding: "4px 8px",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            <FileCheck size={13} />
                            <span>Closed</span>
                          </span>
                        )}

                        <Link
                          to={`/complaints/${c.complaintNumber || c.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ height: "32px", padding: "0 8px" }}
                          title="View Full Details"
                        >
                          <Eye size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RESOLVE GRIEVANCE MODAL */}
      {resolveModalOpen && selectedComplaint && (
        <div
          className="tracker-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !resolving) {
              setResolveModalOpen(false);
            }
          }}
          style={{ zIndex: 1000 }}
        >
          <div
            className="card animate-fade-in"
            style={{
              maxWidth: "520px",
              width: "90%",
              padding: "var(--space-6)",
              boxShadow: "var(--shadow-xl)",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "var(--space-4)",
                paddingBottom: "var(--space-3)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--primary-600)",
                    backgroundColor: "var(--primary-50)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-xs)",
                  }}
                >
                  {selectedComplaint.complaintNumber}
                </span>
                <h3 style={{ fontSize: "1.25rem", marginTop: "4px", letterSpacing: "-0.01em" }}>
                  Resolve Grievance
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {selectedComplaint.title} — {selectedComplaint.location}
                </p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setResolveModalOpen(false)}
                disabled={resolving}
                style={{ padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmResolve}>
              <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
                <label className="form-label" htmlFor="resolution-reason" style={{ fontWeight: 600 }}>
                  Action Taken Report (ATR) / Resolution Remarks *
                </label>
                <textarea
                  id="resolution-reason"
                  rows={4}
                  className="form-textarea"
                  placeholder="Enter details of field inspection, repair squads dispatched, or resolution work completed..."
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  required
                  style={{ width: "100%", fontSize: "0.875rem" }}
                  autoFocus
                />
                <span className="form-hint" style={{ marginTop: "4px" }}>
                  This official note is recorded in the public ledger and directly displayed to the citizen.
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  backgroundColor: "var(--primary-50)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--space-5)",
                  fontSize: "0.8125rem",
                  color: "var(--primary-800)",
                }}
              >
                <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
                <span>
                  Confirming resolution will transition the status to <strong>RESOLVED</strong> and trigger real-time notification to the resident.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResolveModalOpen(false)}
                  disabled={resolving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resolving}
                  style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                >
                  <CheckCircle2 size={16} />
                  <span>{resolving ? "Resolving Ticket..." : "Confirm & Close Ticket"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Department & Category Analytics (Real Live Data Only) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--space-6)" }}>
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "1.125rem" }}>Live Grievances by Department</h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Real-time ticket load across active municipal departments
            </p>
          </div>
          <div style={{ height: "260px", width: "100%" }}>
            {realDepartmentData.length === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                No department tickets recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={realDepartmentData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Submitted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="In Progress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "1.125rem" }}>Complaint Category Distribution</h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Live intake volume categorized by municipal service domain
            </p>
          </div>
          <div style={{ height: "260px", width: "100%" }}>
            {realCategoryChartData.length === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                No category tickets recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={realCategoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Grievances" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Ward Geographic Map View */}
      <div className="card" style={{ padding: "var(--space-6)" }}>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <h2 style={{ fontSize: "1.125rem" }}>Geographic Ward Distribution Map</h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            Real-time incident density and hotspots across Thane administrative wards
          </p>
        </div>
        <WardMapView
          complaints={complaints}
          formatDepartment={(d) => (d || "").replace(/_/g, " ")}
        />
      </div>
    </div>
  );
}
