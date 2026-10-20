const DRAFT_FIELDS = ["title", "description", "category", "location", "priority", "latitude", "longitude"];
const CATEGORIES = new Set(["ROAD", "GARBAGE", "WATER", "ELECTRICITY", "STREET_LIGHT", "DRAINAGE", "OTHER"]);
const PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidImageMetadata = (value) => value === null || (Array.isArray(value) && value.length === 4
  && typeof value[0] === "string" && value[0].length <= 255
  && Number.isSafeInteger(value[1]) && value[1] >= 0
  && Number.isSafeInteger(value[2]) && value[2] >= 0
  && typeof value[3] === "string" && value[3].length <= 100);

export const complaintDraftKey = (userId) => userId === null || userId === undefined
  ? null
  : `civicconnect:complaint-draft:v1:${encodeURIComponent(String(userId))}`;

export function readComplaintDraft(storage, userId) {
  const key = complaintDraftKey(userId);
  if (!key || !storage) return null;
  try {
    const serialized = storage.getItem(key);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const draft = {};
    for (const field of DRAFT_FIELDS) {
      if (typeof parsed[field] !== "string") return null;
      draft[field] = parsed[field];
    }
    if (parsed.submissionKey !== undefined && (typeof parsed.submissionKey !== "string" || !UUID_PATTERN.test(parsed.submissionKey))) return null;
    if (parsed.submissionKey) draft.submissionKey = parsed.submissionKey;
    if (parsed.submissionImage !== undefined) {
      if (!isValidImageMetadata(parsed.submissionImage)) return null;
      draft.submissionImage = parsed.submissionImage;
    }
    if (!CATEGORIES.has(draft.category) || !PRIORITIES.has(draft.priority)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function writeComplaintDraft(storage, userId, draft) {
  const key = complaintDraftKey(userId);
  if (!key || !storage || !draft) return false;
  const hasContent = [draft.title, draft.description, draft.location, draft.latitude, draft.longitude]
    .some((value) => typeof value === "string" && value.trim() !== "");
  try {
    if (!hasContent) {
      storage.removeItem(key);
      return true;
    }
    const safeDraft = Object.fromEntries(DRAFT_FIELDS.map((field) => [field, String(draft[field] ?? "")]));
    if (!CATEGORIES.has(safeDraft.category) || !PRIORITIES.has(safeDraft.priority)) return false;
    if (draft.submissionKey !== undefined) {
      if (typeof draft.submissionKey !== "string" || !UUID_PATTERN.test(draft.submissionKey)) return false;
      safeDraft.submissionKey = draft.submissionKey;
    }
    if (draft.submissionImage !== undefined) {
      if (!isValidImageMetadata(draft.submissionImage)) return false;
      safeDraft.submissionImage = draft.submissionImage;
    }
    storage.setItem(key, JSON.stringify(safeDraft));
    return true;
  } catch {
    return false;
  }
}

export function clearComplaintDraft(storage, userId) {
  const key = complaintDraftKey(userId);
  if (!key || !storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
