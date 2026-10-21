import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getStaffAccounts, createStaffAccount, updateStaffStatus, getAuditLogs } from "../api/admin.js";
import { useToast } from "../hooks/useToast.js";
import { PasswordStrength } from "../components/PasswordStrength.jsx";
import { evaluatePassword } from "../utils/password.js";

const DEPARTMENTS = ["PUBLIC_WORKS", "WATER_SUPPLY", "SOLID_WASTE", "ELECTRICAL", "DRAINAGE", "GENERAL_ADMIN"];
const ROLES = ["FIELD_STAFF", "DEPARTMENT_OFFICER", "SUPERVISOR", "STAFF"];

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "var(--space-1)" }}>Staff & Administrative Governance</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
            Provision department personnel and review security audit logs
          </p>
        </div>
        <Link to="/admin/analytics" className="btn btn-secondary">← Back to Analytics</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)" }}>
        {/* Create Staff Account Form */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <h2 style={{ fontSize: "1.125rem", marginBottom: "var(--space-4)" }}>Provision Municipal Staff</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input required className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Shinde" />
            </div>

            <div className="form-group">
              <label className="form-label">Official Email</label>
              <input required type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. ramesh.shinde@tmc.gov.in" />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d.replace("_", " ")}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input required type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 10 characters" />
              <PasswordStrength password={form.password} />
            </div>

            <button type="submit" disabled={creating} className="btn btn-primary" style={{ marginTop: "var(--space-2)" }}>
              {creating ? "Provisioning..." : "Create Staff Account"}
            </button>
          </form>
        </div>

        {/* Staff accounts list */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <h2 style={{ fontSize: "1.125rem", marginBottom: "var(--space-4)" }}>Department Personnel ({staffList.length})</h2>
          {loading ? (
            <p style={{ color: "var(--text-muted)" }}>Loading staff...</p>
          ) : staffList.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No staff accounts provisioned yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: "400px", overflowY: "auto" }}>
              {staffList.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{s.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.email} • {s.department} • {s.role}</div>
                  </div>
                  <button onClick={() => handleToggleStatus(s)} className={`btn btn-sm ${s.enabled ? "btn-secondary" : "btn-primary"}`} style={{ fontSize: "0.75rem" }}>
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
        <h2 style={{ fontSize: "1.125rem", marginBottom: "var(--space-3)" }}>Administrative Security Audit Log</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", textAlign: "left" }}>
                <th style={{ padding: "8px" }}>Timestamp</th>
                <th style={{ padding: "8px" }}>Actor</th>
                <th style={{ padding: "8px" }}>Action</th>
                <th style={{ padding: "8px" }}>Target</th>
                <th style={{ padding: "8px" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>No audit events logged yet.</td></tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "8px" }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td style={{ padding: "8px", fontWeight: 600 }}>{log.actorEmail}</td>
                    <td style={{ padding: "8px" }}>{log.action}</td>
                    <td style={{ padding: "8px" }}>{log.targetType} #{log.targetId}</td>
                    <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          <button
            type="button"
            disabled={auditPage === 0}
            onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
            className="btn btn-secondary btn-sm"
          >
            ← Prev
          </button>
          <span style={{ fontSize: "0.75rem", alignSelf: "center", color: "var(--text-muted)" }}>Page {auditPage + 1}</span>
          <button
            type="button"
            disabled={auditLogs.length < 10}
            onClick={() => setAuditPage((p) => p + 1)}
            className="btn btn-secondary btn-sm"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
