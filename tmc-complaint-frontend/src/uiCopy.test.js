import test from "node:test";
import assert from "node:assert/strict";
import { getUiCopy, LANGUAGES } from "./uiCopy.js";

test("ui copy is available in English, Marathi, and Hindi", () => {
  for (const { code } of LANGUAGES) {
    const copy = getUiCopy(code);
    assert.ok(copy.brandTitle, `Missing brandTitle for ${code}`);
    assert.ok(copy.dashboardHeading, `Missing dashboardHeading for ${code}`);
    assert.ok(copy.totalComplaints, `Missing totalComplaints for ${code}`);
    assert.ok(copy.searchPlaceholder, `Missing searchPlaceholder for ${code}`);
    assert.ok(copy.howWasResolution, `Missing howWasResolution for ${code}`);
    assert.ok(copy.pageIndicator, `Missing pageIndicator for ${code}`);
  }
});

test("unknown ui language safely falls back to English", () => {
  assert.deepEqual(getUiCopy("invalid_lang"), getUiCopy("en"));
  assert.deepEqual(getUiCopy(null), getUiCopy("en"));
});
