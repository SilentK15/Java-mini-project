import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getStaffAccounts, createStaffAccount, updateStaffStatus, getAuditLogs } from "../api/admin.js";
import { useToast } from "../hooks/useToast.js";
import { PasswordStrength } from "../components/PasswordStrength.jsx";
import { evaluatePassword } from "../utils/password.js";
import { UserPlus, ArrowLeft, Shield, Users, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const DEPARTMENTS = [
  { value: "PUBLIC_WORKS", label: "Public Works (Roads/Bridges)" },
  { value: "SOLID_WASTE", label: "Solid Waste & Sanitation" },
  { value: "WATER", label: "Water Supply" },
  { value: "SEWERAGE", label: "Sewerage & Drainage" },
  { value: "STREET_LIGHTING", label: "Street Lighting & Electrical" },
  { value: "OTHER", label: "Other / General Administration" },
];

const ROLES = [
  { value: "DEPARTMENT_OFFICER", label: "Department Officer" },
  { value: "FIELD_STAFF", label: "Field Staff / Ground Worker" },
  { value: "SUPERVISOR", label: "Supervisor / Ward Inspector" },
  { value: "STAFF", label: "General Municipal Staff" },
];

export function StaffManagement() {
  const { success, error: toastError } = useToast();
  const [staffList, setStaffList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(0);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "PUBLIC_WORKS",
    role: "FIELD_STAFF",
  });
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [staffData, auditData] = await Promise.all([
        getStaffAccounts().catch(() => []),
        getAuditLogs({ page: auditPage, size: 10 }).catch(() => ({ content: [] })),
      ]);
      setStaffList(staffData);
      setAuditLogs(Array.isArray(auditData) ? auditData : (auditData.content || []));
    } finally {
      setLoading(false);
    }
  }, [auditPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const evalPwd = evaluatePassword(form.password);
    if (!evalPwd.checks.length || !evalPwd.checks.notCommon) {
      toastError("Password must be at least 10 characters and secure.");
      return;
    }
    setCreating(true);
    try {
      await createStaffAccount(form);
      success("Staff account provisioned successfully.");
      setForm({ name: "", email: "", password: "", department: "PUBLIC_WORKS", role: "FIELD_STAFF" });
      loadData();
    } catch (err) {
      toastError(err.message || "Failed to create staff account.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (staff) => {
    const nextState = !staff.enabled;
    try {
      await updateStaffStatus(staff.id, nextState);
      success(`Staff account ${nextState ? "enabled" : "disabled"}.`);
      loadData();
    } catch (err) {
      toastError(err.message || "Failed to change staff status.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
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
              Access Control & Governance
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>Staff & Security Management</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", marginTop: "2px" }}>
            Provision municipal personnel and audit administrative actions
          </p>
        </div>
        <Link to="/admin/analytics" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Analytics</span>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "var(--space-6)" }}>
        {/* Create Staff Account Form */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-4)" }}>
            <UserPlus size={18} style={{ color: "var(--primary-600)" }} />
            <h2 style={{ fontSize: "1.125rem" }}>Provision Municipal Staff</h2>
          </div>

          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                required
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ramesh Shinde"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official TMC Email</label>
              <input
                required
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. ramesh.shinde@tmc.gov.in"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="form-select"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                required
                type="password"
                className="form-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 10 characters"
              />
              <div style={{ marginTop: "4px" }}>
                <PasswordStrength password={form.password} />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="btn btn-primary"
              style={{ marginTop: "var(--space-2)", height: "42px" }}
            >
              {creating ? "Provisioning..." : "Create Staff Account"}
            </button>
          </form>
        </div>

        {/* Staff Accounts List */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={18} style={{ color: "var(--primary-600)" }} />
              <h2 style={{ fontSize: "1.125rem" }}>Personnel Directory ({staffList.length})</h2>
            </div>
          </div>

          {loading ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading personnel directory...</p>
          ) : staffList.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No staff accounts provisioned yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: "380px", overflowY: "auto" }}>
              {staffList.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    backgroundColor: "var(--bg-subtle)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "var(--primary-100)",
                        color: "var(--primary-700)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                      }}
                    >
                      {(s.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{s.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {s.email} &bull; {s.department.replace("_", " ")}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(s)}
                    className={`btn btn-sm ${s.enabled ? "btn-secondary" : "btn-primary"}`}
                    style={{ height: "28px", padding: "0 10px", fontSize: "0.75rem" }}
                  >
                    {s.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security Audit Log */}
      <div className="card" style={{ padding: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-4)" }}>
          <Shield size={18} style={{ color: "var(--primary-600)" }} />
          <h2 style={{ fontSize: "1.125rem" }}>Administrative Security Audit Trail</h2>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                    No administrative audit events recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "0.78125rem" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.actorEmail}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: "var(--bg-subtle)",
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                      {log.targetType} #{log.targetId}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
          <button
            type="button"
            disabled={auditPage === 0}
            onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0 4px" }}>
            Page {auditPage + 1}
          </span>
          <button
            type="button"
            disabled={auditLogs.length < 10}
            onClick={() => setAuditPage((p) => p + 1)}
            className="btn btn-secondary btn-sm"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
