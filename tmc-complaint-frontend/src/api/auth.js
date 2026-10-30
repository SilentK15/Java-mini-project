import { AUTH_URL, apiRequest, apiJsonRequest, setCsrfToken } from "./client.js";

export const getCsrf = async () => {
  try {
    const res = await apiRequest(`${AUTH_URL}/csrf`);
    if (res.ok) {
      const data = await res.json();
      if (data?.token) {
        setCsrfToken(data.token);
      }
      return data;
    }
  } catch {
    // Ignore error
  }
};

export const login = async (email, password) => {
  return apiJsonRequest(`${AUTH_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
};

export const register = async (name, email, password) => {
  return apiJsonRequest(`${AUTH_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
};

export const logout = async () => {
  return apiRequest(`${AUTH_URL}/logout`, { method: "POST" });
};

export const getCurrentUser = async () => {
  return apiJsonRequest(`${AUTH_URL}/me`);
};

export const updateProfile = async (name) => {
  return apiJsonRequest(`${AUTH_URL}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
};
