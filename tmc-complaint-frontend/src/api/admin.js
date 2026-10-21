import { ADMIN_URL, apiRequest, apiJsonRequest } from "./client.js";

export const getDepartmentAnalytics = async () => {
  return apiJsonRequest(`${ADMIN_URL}/analytics/departments`);
};

export const getStaffAccounts = async () => {
  return apiJsonRequest(`${ADMIN_URL}/staff`);
};

export const createStaffAccount = async (data) => {
  return apiJsonRequest(`${ADMIN_URL}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const updateStaffStatus = async (staffId, enable) => {
  const path = enable ? "enable" : "disable";
  return apiJsonRequest(`${ADMIN_URL}/staff/${staffId}/${path}`, {
    method: "POST",
  });
};

export const assignComplaint = async (complaintId, { staffId, reason }) => {
  const params = new URLSearchParams();
  if (staffId) params.set("staffId", staffId);
  if (reason) params.set("reason", reason);
  return apiJsonRequest(`${ADMIN_URL}/complaints/${complaintId}/assignment?${params.toString()}`, {
    method: "PUT",
  });
};

export const getAuditLogs = async ({ page = 0, size = 15 } = {}) => {
  return apiJsonRequest(`${ADMIN_URL}/audit?page=${page}&size=${size}`);
};

export const exportComplaintsCsv = async (filters = {}) => {
  const query = new URLSearchParams();
  if (filters.status && filters.status !== "ALL") query.set("status", filters.status);
  if (filters.category && filters.category !== "ALL") query.set("category", filters.category);
  if (filters.priority && filters.priority !== "ALL") query.set("priority", filters.priority);
  return apiRequest(`${ADMIN_URL}/complaints/export.csv?${query.toString()}`);
};
