import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { Navbar } from "./components/Navbar.jsx";
import { ToastContainer } from "./components/Toast.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { PublicTrackerModal } from "./PublicTrackerModal.jsx";
import { API_ROOT } from "./api/client.js";
import { getUiCopy } from "./uiCopy.js";

// Pages
import { Landing } from "./pages/Landing.jsx";
import { Login } from "./pages/Login.jsx";
import { Register } from "./pages/Register.jsx";
import { CitizenDashboard } from "./pages/CitizenDashboard.jsx";
import { SubmitComplaint } from "./pages/SubmitComplaint.jsx";
import { ComplaintDetail } from "./pages/ComplaintDetail.jsx";
import { StaffQueue } from "./pages/StaffQueue.jsx";
import { AdminDashboard } from "./pages/AdminDashboard.jsx";
import { StaffManagement } from "./pages/StaffManagement.jsx";
import { NotFound } from "./pages/NotFound.jsx";

function DashboardDispatcher() {
  const { isAdmin, isStaff } = useAuth();
  if (isAdmin) return <AdminDashboard />;
  if (isStaff) return <StaffQueue />;
  return <CitizenDashboard />;
}

export default function App() {
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackedNumber, setTrackedNumber] = useState("");
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("civicconnect_language") || "en";
    } catch {
      return "en";
    }
  });

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    try {
      localStorage.setItem("civicconnect_language", lang);
    } catch {
      // Ignore
    }
  };

  const handleOpenTracker = (complaintNumber = "") => {
    setTrackedNumber(complaintNumber);
    setTrackerOpen(true);
  };

  const uiCopy = getUiCopy(language);

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <div className="app">
            <Navbar
              onOpenTracker={() => handleOpenTracker("")}
              currentLanguage={language}
              onLanguageChange={handleLanguageChange}
            />

            <main className="main-content">
              <div className="app-container">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Landing onOpenTracker={handleOpenTracker} />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/track/:complaintNumber?"
                    element={<Landing onOpenTracker={handleOpenTracker} />}
                  />

                  {/* Authenticated routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardDispatcher />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/submit"
                    element={
                      <ProtectedRoute allowedRoles={["CITIZEN", "ADMIN"]}>
                        <SubmitComplaint />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/complaints/:complaintNumber"
                    element={
                      <ProtectedRoute>
                        <ComplaintDetail />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin-only routes */}
                  <Route
                    path="/admin/analytics"
                    element={
                      <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/staff"
                    element={
                      <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <StaffManagement />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 Fallback */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </main>

            <footer
              style={{
                backgroundColor: "var(--bg-surface)",
                borderTop: "1px solid var(--border-subtle)",
                padding: "var(--space-6) 0",
                marginTop: "auto",
              }}
            >
              <div
                className="app-container"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "var(--space-4)",
                  fontSize: "0.8125rem",
                  color: "var(--text-muted)",
                  flexDirection: "row",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>CivicConnect</span>
                  <span>&bull;</span>
                  <span>Thane Municipal Corporation Grievance Redressal</span>
                  <span>&bull;</span>
                  <span>&copy; {new Date().getFullYear()}</span>
                </div>

                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                  <span
                    style={{
                      backgroundColor: "var(--bg-subtle)",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      fontWeight: 500,
                    }}
                  >
                    Toll-Free: <strong>1800-222-108</strong>
                  </span>
                  <span
                    style={{
                      backgroundColor: "var(--bg-subtle)",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      fontWeight: 500,
                    }}
                  >
                    Disaster Control: <strong>022-25371010</strong>
                  </span>
                </div>
              </div>
            </footer>

            <ToastContainer />

            {trackerOpen && (
              <PublicTrackerModal
                complaintNumber={trackedNumber}
                apiRoot={API_ROOT}
                uiCopy={uiCopy}
                onClose={() => setTrackerOpen(false)}
                onNavigateAuth={() => setTrackerOpen(false)}
              />
            )}
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
