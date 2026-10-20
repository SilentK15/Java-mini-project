import test from "node:test";
import assert from "node:assert/strict";
import { clearComplaintDraft, complaintDraftKey, readComplaintDraft, writeComplaintDraft } from "./complaintDraft.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

const draft = {
  title: "Broken streetlight",
  description: "The light is not working near the bus stop.",
  category: "STREET_LIGHT",
  location: "Main Road, Thane",
  priority: "MEDIUM",
  latitude: "19.2183",
  longitude: "72.9781",
};

test("drafts are separated by account and round-trip complaint fields", () => {
  const storage = new MemoryStorage();
  const pendingKey = "123e4567-e89b-42d3-a456-426614174000";
  const imageMetadata = ["repair.png", 4096, 1760040000000, "image/png"];
  const pending = { ...draft, submissionKey: pendingKey, submissionImage: imageMetadata };
  assert.equal(writeComplaintDraft(storage, 17, pending), true);
  assert.deepEqual(readComplaintDraft(storage, 17), pending);
  assert.equal(readComplaintDraft(storage, 18), null);
  assert.equal(complaintDraftKey(null), null);
});

test("draft loading rejects malformed data and unsupported form options", () => {
  const storage = new MemoryStorage();
  const key = complaintDraftKey(17);
  storage.setItem(key, "not-json");
  assert.equal(readComplaintDraft(storage, 17), null);
  storage.setItem(key, JSON.stringify({ ...draft, category: "ADMIN" }));
  assert.equal(readComplaintDraft(storage, 17), null);
  storage.setItem(key, JSON.stringify({ ...draft, submissionKey: "123e4567-e89b-42d3-a456-426614174000", submissionImage: ["photo.png", -1, 0, "image/png"] }));
  assert.equal(readComplaintDraft(storage, 17), null);
});

test("empty drafts are removed and drafts can be cleared on sign-out", () => {
  const storage = new MemoryStorage();
  writeComplaintDraft(storage, 17, draft);
  assert.equal(writeComplaintDraft(storage, 17, { ...draft, title: "", description: "", location: "", latitude: "", longitude: "" }), true);
  assert.equal(readComplaintDraft(storage, 17), null);
  writeComplaintDraft(storage, 17, draft);
  assert.equal(clearComplaintDraft(storage, 17), true);
  assert.equal(readComplaintDraft(storage, 17), null);
});

test("storage failures do not prevent complaint entry", () => {
  const unavailableStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  assert.equal(readComplaintDraft(unavailableStorage, 17), null);
  assert.equal(writeComplaintDraft(unavailableStorage, 17, draft), false);
  assert.equal(clearComplaintDraft(unavailableStorage, 17), false);
});
