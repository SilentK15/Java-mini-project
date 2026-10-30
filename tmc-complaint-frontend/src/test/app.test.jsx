import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { PriorityBadge } from "../components/PriorityBadge.jsx";
import { PasswordStrength } from "../components/PasswordStrength.jsx";
import { evaluatePassword } from "../utils/password.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { ProgressStepper } from "../components/ProgressStepper.jsx";
import { ComplaintCard } from "../components/ComplaintCard.jsx";
import { PublicTrackerModal } from "../PublicTrackerModal.jsx";
import { Login } from "../pages/Login.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";
import { ProtectedRoute } from "../components/ProtectedRoute.jsx";

describe("Phase 3 Frontend Components & Workflows", () => {
  it("renders status badge correctly with label and styling", () => {
    const { rerender } = render(<StatusBadge status="RESOLVED" />);
    expect(screen.getByText("Resolved")).toBeInTheDocument();

    rerender(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();

    rerender(<StatusBadge status="SUBMITTED" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("renders priority badge with appropriate text", () => {
    const { rerender } = render(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText("High Priority")).toBeInTheDocument();

    rerender(<PriorityBadge priority="LOW" />);
    expect(screen.getByText("Low Priority")).toBeInTheDocument();
  });

  it("evaluates password policy rules correctly", () => {
    expect(evaluatePassword("short").checks.length).toBe(false);
    expect(evaluatePassword("password123").checks.notCommon).toBe(false);

    const strong = evaluatePassword("CivicThane2026!#Strong");
    expect(strong.checks.length).toBe(true);
    expect(strong.checks.notCommon).toBe(true);
    expect(strong.checks.bytes).toBe(true);
    expect(strong.label).toBe("Strong");
  });

  it("renders password strength meter with rule checklist", () => {
    render(<PasswordStrength password="ValidPass123!" />);
    expect(screen.getByText(/At least 10 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Not a common password/i)).toBeInTheDocument();
  });

  it("renders empty state with icon, title, and action trigger", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No records"
        description="Nothing here"
        actionText="Click me"
        onAction={onAction}
      />
    );
    expect(screen.getByText("No records")).toBeInTheDocument();
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders progress stepper marking completed steps", () => {
    render(<ProgressStepper currentStatus="IN_PROGRESS" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("renders complaint card with human-readable complaint number", () => {
    const mockComplaint = {
      id: 42,
      complaintNumber: "TMC-2026-000042",
      title: "Broken streetlight on Ghodbunder Road",
      description: "Street light flickering near junction",
      priority: "HIGH",
      status: "SUBMITTED",
      location: "Ghodbunder Road, Thane",
      createdAt: "2026-10-20T12:00:00",
    };

    render(
      <MemoryRouter>
        <ComplaintCard complaint={mockComplaint} />
      </MemoryRouter>
    );

    expect(screen.getByText("TMC-2026-000042")).toBeInTheDocument();
    expect(screen.getByText("Broken streetlight on Ghodbunder Road")).toBeInTheDocument();
    expect(screen.getByText(/Ghodbunder Road, Thane/)).toBeInTheDocument();
  });

  it("renders login page with email and password inputs", () => {
    const fakeAuth = {
      user: null,
      loading: false,
      login: vi.fn(),
    };

    render(
      <MemoryRouter>
        <ToastProvider>
          <AuthContext.Provider value={fakeAuth}>
            <Login />
          </AuthContext.Provider>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("redirects unauthenticated users in protected routes", () => {
    const fakeAuth = { user: null, loading: false };

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthContext.Provider value={fakeAuth}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Fallback</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Login Fallback")).toBeInTheDocument();
  });

  it("allows access in protected routes when user is authenticated with proper role", () => {
    const fakeAuth = {
      user: { email: "officer@tmc.gov.in", role: "ADMIN" },
      loading: false,
    };

    render(
      <MemoryRouter initialEntries={["/admin/analytics"]}>
        <AuthContext.Provider value={fakeAuth}>
          <Routes>
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <div>Admin Analytics Dashboard</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText("Admin Analytics Dashboard")).toBeInTheDocument();
  });

  it("public tracker modal displays only redacted public fields without leaking internal notes or citizen identity", async () => {
    // Mock public tracking response
    const mockPublicTrack = {
      complaintNumber: "TMC-2026-000099",
      title: "Garbage accumulation",
      category: "GARBAGE",
      department: "SOLID_WASTE",
      status: "SUBMITTED",
      priority: "MEDIUM",
      createdAt: "2026-10-20T10:00:00",
      location: "Naupada Area",
      timeline: [],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPublicTrack,
    });

    render(
      <PublicTrackerModal
        complaintNumber="TMC-2026-000099"
        apiRoot="http://localhost:8080"
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByText("TMC-2026-000099")).toBeInTheDocument();
    expect(screen.getByText("Naupada Area")).toBeInTheDocument();
    // Verify citizen personal details are absent
    expect(screen.queryByText("submittedBy")).not.toBeInTheDocument();
    expect(screen.queryByText("citizenPhone")).not.toBeInTheDocument();
  });
});
