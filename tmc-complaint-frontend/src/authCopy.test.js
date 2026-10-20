import test from "node:test";
import assert from "node:assert/strict";
import { getAuthCopy } from "./authCopy.js";

test("authentication labels are available in English, Marathi, and Hindi", () => {
  for (const language of ["en", "mr", "hi"]) {
    const copy = getAuthCopy(language);
    for (const key of ["language", "welcomeBack", "createAccountHeading", "loginDescription", "registerDescription", "fullName", "email", "password", "signIn", "createAccount", "switchToRegister", "switchToLogin"]) {
      assert.ok(copy[key], `${language} is missing ${key}`);
    }
  }
});

test("unknown authentication language safely falls back to English", () => {
  assert.deepEqual(getAuthCopy("xx"), getAuthCopy("en"));
});
