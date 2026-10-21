const COMMON_PASSWORDS = new Set([
  "password", "password123", "password1234", "1234567890", "123456789012",
  "qwertyuiop", "administrator", "admin12345", "welcome123", "letmein123",
  "iloveyou123", "changeme123", "civicconnect", "civicconnect123"
]);

export function evaluatePassword(pwd) {
  if (!pwd) return { score: 0, label: "Enter a password", checks: { length: false, notCommon: true, bytes: true } };
  const bytes = new TextEncoder().encode(pwd).length;
  const isCommon = COMMON_PASSWORDS.has(pwd.toLowerCase().trim());
  const checks = {
    length: pwd.length >= 10,
    notCommon: !isCommon,
    bytes: bytes <= 72,
    hasUpperLower: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
    hasNumberOrSymbol: /[\d\W_]/.test(pwd),
  };
  let score = 0;
  if (checks.length) score += 1;
  if (checks.notCommon && checks.bytes) score += 1;
  if (checks.hasUpperLower) score += 1;
  if (checks.hasNumberOrSymbol) score += 1;
  if (pwd.length >= 14) score += 1;

  let label = "Weak";
  let color = "#ef4444";
  if (score >= 4) {
    label = "Strong";
    color = "#10b981";
  } else if (score >= 3) {
    label = "Good";
    color = "#3b82f6";
  } else if (score >= 2) {
    label = "Fair";
    color = "#f59e0b";
  }
  return { score, label, color, checks };
}
