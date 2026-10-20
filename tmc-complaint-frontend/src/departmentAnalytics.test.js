import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDepartmentAnalytics } from "./departmentAnalytics.js";

test("accepts valid department summaries and rejects malformed rows", () => {
  const valid = { department: "WATER", total: 10, submitted: 2, inProgress: 3, reopenRequested: 1, resolved: 4 };
  assert.deepEqual(normalizeDepartmentAnalytics([valid, null, { ...valid, total: -1 }, { ...valid, department: 3 }]), [valid]);
});

test("returns an empty list for unexpected response shapes", () => {
  assert.deepEqual(normalizeDepartmentAnalytics({ departments: [] }), []);
});
