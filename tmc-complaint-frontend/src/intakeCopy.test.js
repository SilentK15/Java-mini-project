import test from "node:test";
import assert from "node:assert/strict";
import { getIntakeCopy, INTAKE_LANGUAGES } from "./intakeCopy.js";

test("intake copy is available in English, Marathi, and Hindi", () => {
  assert.deepEqual(INTAKE_LANGUAGES.map(({ code }) => code), ["en", "mr", "hi"]);
  for (const language of INTAKE_LANGUAGES) {
    const copy = getIntakeCopy(language.code);
    assert.ok(copy.title);
    assert.ok(copy.description);
    assert.ok(copy.location);
    assert.ok(copy.submit);
    assert.equal(Object.keys(copy.categories).length, 7);
  }
});

test("unknown intake language safely falls back to English", () => {
  assert.equal(getIntakeCopy("xx").submit, getIntakeCopy("en").submit);
});
