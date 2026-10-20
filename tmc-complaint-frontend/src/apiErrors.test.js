import test from "node:test";
import assert from "node:assert/strict";
import { getApiErrorMessage } from "./apiErrors.js";

test("prefers a Problem Detail response detail", async () => {
  const response = { json: async () => ({ detail: "The image is too large.", error: "Bad Request" }) };
  assert.equal(await getApiErrorMessage(response, "Request failed."), "The image is too large.");
});

test("supports message and error response shapes", async () => {
  assert.equal(await getApiErrorMessage({ json: async () => ({ message: "Account is inactive." }) }, "Failed."), "Account is inactive.");
  assert.equal(await getApiErrorMessage({ json: async () => ({ error: "Conflict" }) }, "Failed."), "Conflict");
});

test("uses the fallback for blank, malformed, and non-JSON responses", async () => {
  assert.equal(await getApiErrorMessage({ json: async () => ({ detail: "  " }) }, "Please retry."), "Please retry.");
  assert.equal(await getApiErrorMessage({ json: async () => { throw new Error("invalid json"); } }, "Please retry."), "Please retry.");
});
