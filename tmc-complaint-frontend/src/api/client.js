import { getApiErrorMessage } from "../apiErrors.js";

export const API_ROOT = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:8080");
export const API_URL = `${API_ROOT}/api/complaints`;
export const AUTH_URL = `${API_ROOT}/api/auth`;
export const ADMIN_URL = `${API_ROOT}/api/admin`;

export const getCsrfToken = () => {
  const token = document.cookie
    .split("; ")
    .find((item) => item.startsWith("XSRF-TOKEN="))
    ?.split("=")
    .slice(1)
    .join("=");
  return token ? decodeURIComponent(token) : "";
};

export const apiRequest = async (url, options = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (method !== "GET" && method !== "HEAD") {
    headers["X-XSRF-TOKEN"] = getCsrfToken();
  }
  return fetch(url, { ...options, method, headers, credentials: "include" });
};

export const apiJsonRequest = async (url, options = {}) => {
  const response = await apiRequest(url, options);
  if (!response.ok) {
    const errorMsg = await getApiErrorMessage(response, "Request failed.");
    const err = new Error(errorMsg);
    err.status = response.status;
    err.response = response;
    throw err;
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};
