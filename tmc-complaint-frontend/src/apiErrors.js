export async function getApiErrorMessage(response, fallback) {
  try {
    const payload = await response.json();
    for (const key of ["detail", "message", "error"]) {
      if (typeof payload?.[key] === "string" && payload[key].trim()) return payload[key].trim();
    }
  } catch {
    // Empty and non-JSON error bodies are expected for some proxy/server failures.
  }
  return fallback;
}
