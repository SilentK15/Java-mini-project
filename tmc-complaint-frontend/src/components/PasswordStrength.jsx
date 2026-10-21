import { evaluatePassword } from "../utils/password.js";

export function PasswordStrength({ password }) {
  const result = evaluatePassword(password);
  if (!password) {
    return (
      <div className="password-strength-meter" style={{ marginTop: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        <span>Minimum 10 characters required</span>
      </div>
    );
  }
  const pct = Math.min(100, Math.max(10, result.score * 20));
  return (
    <div className="password-strength-meter" style={{ marginTop: "8px" }} aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
        <span>Strength: <strong style={{ color: result.color }}>{result.label}</strong></span>
        <span>{result.checks.bytes ? `${password.length} chars` : "Exceeds 72 bytes"}</span>
      </div>
      <div style={{ height: "4px", backgroundColor: "var(--border-default)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: result.color, transition: "width 0.3s ease" }} />
      </div>
      <ul style={{ margin: "6px 0 0 0", padding: "0 0 0 16px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <li style={{ color: result.checks.length ? "var(--status-resolved-text)" : "var(--status-rejected-text)" }}>
          {result.checks.length ? "✓" : "✗"} At least 10 characters
        </li>
        <li style={{ color: result.checks.notCommon ? "var(--status-resolved-text)" : "var(--status-rejected-text)" }}>
          {result.checks.notCommon ? "✓" : "✗"} Not a common password
        </li>
        <li style={{ color: result.checks.bytes ? "var(--status-resolved-text)" : "var(--status-rejected-text)" }}>
          {result.checks.bytes ? "✓" : "✗"} Max 72 bytes
        </li>
      </ul>
    </div>
  );
}
