import { API_URL, apiRequest, apiJsonRequest } from "./client.js";

export const getComplaints = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", params.page);
  if (params.size !== undefined) query.set("size", params.size ?? 10);
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.category && params.category !== "ALL") query.set("category", params.category);
  if (params.priority && params.priority !== "ALL") query.set("priority", params.priority);
  if (params.sort) query.set("sort", params.sort);
  return apiJsonRequest(`${API_URL}?${query.toString()}`);
};

export const getComplaintById = async (id) => {
  return apiJsonRequest(`${API_URL}/${id}`);
};

export const getPublicTrack = async (complaintNumber) => {
  return apiJsonRequest(`${API_URL}/public/track/${encodeURIComponent(complaintNumber)}`);
};

export const getPublicStats = async () => {
  return apiJsonRequest(`${API_URL}/public/stats`);
};

export function generateUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const submitComplaint = async (formData, idempotencyKey) => {
  const headers = {};
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const key = idempotencyKey && uuidRegex.test(idempotencyKey) ? idempotencyKey : generateUuid();
  headers["Idempotency-Key"] = key;
  return apiJsonRequest(API_URL, {
    method: "POST",
    headers,
    body: formData,
  });
};

export const checkDuplicates = async ({ category, description, location }) => {
  return apiJsonRequest(`${API_URL}/possible-duplicates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, description, location }),
  });
};

export const classifyComplaint = async (text) => {
  return apiJsonRequest(`${API_URL}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
};

export const getComplaintHistory = async (id) => {
  return apiJsonRequest(`${API_URL}/${id}/history`);
};

export const getInternalNotes = async (id) => {
  return apiJsonRequest(`${API_URL}/${id}/internal-notes`);
};

export const addInternalNote = async (id, note) => {
  return apiJsonRequest(`${API_URL}/${id}/internal-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
};

export const updateComplaintStatus = async (id, { status, reason, resolutionEvidenceFile }) => {
  if (resolutionEvidenceFile) {
    const imgData = new FormData();
    imgData.append("file", resolutionEvidenceFile);
    await apiRequest(`${API_URL}/${id}/resolution-evidence`, {
      method: "POST",
      body: imgData,
    });
  }
  const params = new URLSearchParams({ status });
  if (reason?.trim()) params.set("reason", reason.trim());
  return apiJsonRequest(`${API_URL}/${id}/status?${params.toString()}`, {
    method: "PUT",
  });
};

export const submitFeedback = async (id, { rating, feedback }) => {
  return apiJsonRequest(`${API_URL}/${id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, feedback }),
  });
};

export const reopenComplaint = async (id, reason) => {
  return apiJsonRequest(`${API_URL}/${id}/appeal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
};
