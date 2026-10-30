export async function getApiErrorMessage(response, fallback) {
  try {
    const clone = typeof response?.clone === "function" ? response.clone() : response;
    const payload = await clone.json();
    for (const key of ["detail", "message", "error"]) {
      if (typeof payload?.[key] === "string" && payload[key].trim()) return payload[key].trim();
    }
  } catch {
    // Empty and non-JSON error bodies are expected for some proxy/server failures.
  }
  if (response?.status === 409) return "An account with this email already exists. Please sign in instead.";
  if (response?.status === 401) return "Email or password is incorrect.";
  if (response?.status === 403) return "Access denied or session expired. Please refresh and try again.";
  if (response?.status === 429) return "Too many requests. Please wait a moment and try again.";
  return fallback;
}
