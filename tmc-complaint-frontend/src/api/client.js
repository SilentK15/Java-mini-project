import { getApiErrorMessage } from "../apiErrors.js";

export const API_ROOT = import.meta.env.VITE_API_URL ?? "";
export const API_URL = `${API_ROOT}/api/complaints`;
export const AUTH_URL = `${API_ROOT}/api/auth`;
export const ADMIN_URL = `${API_ROOT}/api/admin`;

let memoryCsrfToken = "";

export const setCsrfToken = (token) => {
  if (token) {
    memoryCsrfToken = token;
    try {
      sessionStorage.setItem("XSRF-TOKEN", token);
      if (typeof document !== "undefined") {
        document.cookie = `XSRF-TOKEN=${encodeURIComponent(token)}; path=/; samesite=lax`;
      }
    } catch {
      // Ignore storage restrictions
    }
  }
};

export const getCsrfToken = () => {
  const cookieToken = typeof document !== "undefined"
    ? document.cookie
        .split("; ")
        .find((item) => item.startsWith("XSRF-TOKEN="))
        ?.split("=")
        .slice(1)
        .join("=")
    : "";
  const sessionToken = (() => {
    try {
      return sessionStorage.getItem("XSRF-TOKEN") || "";
    } catch {
      return "";
    }
  })();
  return memoryCsrfToken || (cookieToken ? decodeURIComponent(cookieToken) : "") || sessionToken;
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
