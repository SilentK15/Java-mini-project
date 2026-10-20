const COUNTS = ["total", "submitted", "inProgress", "reopenRequested", "resolved"];

export function normalizeDepartmentAnalytics(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row && typeof row.department === "string"
      && COUNTS.every((field) => Number.isSafeInteger(row[field]) && row[field] >= 0));
}
