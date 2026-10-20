import { useCallback, useEffect, useRef, useState } from "react";
import { clearComplaintDraft, readComplaintDraft, writeComplaintDraft } from "./complaintDraft.js";
import { getIntakeCopy, INTAKE_LANGUAGES } from "./intakeCopy.js";
import { getApiErrorMessage } from "./apiErrors.js";
import { getAuthCopy } from "./authCopy.js";
import { normalizeDepartmentAnalytics } from "./departmentAnalytics.js";
import { getUiCopy, LANGUAGES } from "./uiCopy.js";
import { searchThaneLocations, reverseGeocodeThane, THANE_WARDS, THANE_LOCALITIES } from "./locationData.js";
import { PublicTrackerModal } from "./PublicTrackerModal.jsx";
import { WardMapView } from "./WardMapView.jsx";
import "./App.css";

const API_ROOT = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:8080");
const API_URL = `${API_ROOT}/api/complaints`;
const AUTH_URL = `${API_ROOT}/api/auth`;
const ADMIN_URL = `${API_ROOT}/api/admin`;
const EMPLOYEE_ROLES = ["STAFF", "FIELD_STAFF", "DEPARTMENT_OFFICER", "SUPERVISOR"];
const isDepartmentEmployee = (role) => EMPLOYEE_ROLES.includes(role);
const formatRole = (role) => (role || "STAFF").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const EMPTY_COMPLAINT_FORM = Object.freeze({
  title: "", description: "", category: "ROAD", location: "", priority: "MEDIUM", latitude: "", longitude: "",
});
const getSessionStorage = () => {
  try { return window.sessionStorage; } catch { return null; }
};

const COMMON_PASSWORDS = new Set([
  "password", "password123", "password1234", "1234567890", "123456789012",
  "qwertyuiop", "administrator", "admin12345", "welcome123", "letmein123",
  "iloveyou123", "changeme123", "civicconnect", "civicconnect123"
]);

function evaluatePassword(pwd) {
  if (!pwd) return { score: 0, label: "Enter a password", checks: { length: false, notCommon: true, bytes: true } };
  const bytes = new TextEncoder().encode(pwd).length;
  const isCommon = COMMON_PASSWORDS.has(pwd.toLowerCase().trim());
  const checks = {
    length: pwd.length >= 10,
    notCommon: !isCommon,
    bytes: bytes <= 72,
    hasUpperLower: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
    hasNumberOrSymbol: /[\d\W_]/.test(pwd),
  };
  let score = 0;
  if (checks.length) score += 1;
  if (checks.notCommon && checks.bytes) score += 1;
  if (checks.hasUpperLower) score += 1;
  if (checks.hasNumberOrSymbol) score += 1;
  if (pwd.length >= 14) score += 1;

  let label = "Weak";
  let color = "#ef4444";
  if (score >= 4) {
    label = "Strong";
    color = "#10b981";
  } else if (score >= 3) {
    label = "Good";
    color = "#3b82f6";
  } else if (score >= 2) {
    label = "Fair";
    color = "#f59e0b";
  }
  return { score, label, color, checks };
}

function PasswordStrengthMeter({ password }) {
  const result = evaluatePassword(password);
  if (!password) {
    return (
      <div className="password-strength-meter" style={{ marginTop: "6px", fontSize: "0.8rem", color: "#6b7280" }}>
        <span>Minimum 10 characters required</span>
      </div>
    );
  }
  const pct = Math.min(100, Math.max(10, result.score * 20));
  return (
    <div className="password-strength-meter" style={{ marginTop: "8px" }} aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
        <span>Strength: <strong style={{ color: result.color }}>{result.label}</strong></span>
        <span>{result.checks.bytes ? `${password.length} chars` : "Exceeds 72 bytes"}</span>
      </div>
      <div style={{ height: "4px", backgroundColor: "#e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: result.color, transition: "width 0.3s ease" }} />
      </div>
      <ul style={{ margin: "6px 0 0 0", padding: "0 0 0 16px", fontSize: "0.75rem", color: "#6b7280" }}>
        <li style={{ color: result.checks.length ? "#059669" : "#dc2626" }}>
          {result.checks.length ? "✓" : "✗"} At least 10 characters
        </li>
        <li style={{ color: result.checks.notCommon ? "#059669" : "#dc2626" }}>
          {result.checks.notCommon ? "✓" : "✗"} Not a common password
        </li>
        <li style={{ color: result.checks.bytes ? "#059669" : "#dc2626" }}>
          {result.checks.bytes ? "✓" : "✗"} Max 72 bytes
        </li>
      </ul>
    </div>
  );
}

const RESOLUTION_PRESETS = {
  en: {
    GARBAGE: [
      "Waste cleared and area disinfected.",
      "Carcass removed and spot sanitized.",
      "Dustbin emptied and surrounding litter removed."
    ],
    ROAD: [
      "Pothole filled with cold asphalt mix and rolled.",
      "Damaged divider/footpath repaired.",
      "Obstacles cleared; safe vehicular flow restored."
    ],
    WATER: [
      "Pipeline leak repaired; normal water pressure restored.",
      "Water pressure inspected and supply verified.",
      "Pipeline flushed; potable water quality tested."
    ],
    DRAINAGE: [
      "Drainage cleared of silt and blockage using jetting unit.",
      "Damaged manhole cover replaced with heavy-duty safety lid.",
      "Sewage overflow cleared; sanitization completed."
    ],
    STREET_LIGHT: [
      "Streetlight luminaire/bulb replaced; verified functional.",
      "Electrical cable repaired and street illumination restored."
    ],
    ELECTRICITY: [
      "Exposed live wire insulated and secured safely.",
      "Pole short circuit inspected and repaired."
    ],
    OTHER: [
      "Site inspected and remedial action taken as per norms."
    ]
  },
  mr: {
    GARBAGE: [
      "कचरा उचलून परिसर स्वच्छ व निर्जंतुक करण्यात आला आहे.",
      "मृत प्राणी नियमानुसार तातडीने हलवून परिसराचे निर्जंतुकीकरण पूर्ण केले.",
      "कचरा कुंडी रिकामी करून परिसरातील सर्व कचरा हलवला आहे."
    ],
    ROAD: [
      "रस्त्यावरील खड्डा डांबरी मिश्रणाने भरून समतल करण्यात आला आहे.",
      "तुटलेला दुभाजक/पादचारी मार्ग दुरुस्त करण्यात आला आहे.",
      "रस्त्यावरील अडथळे दूर करून वाहतूक सुरळीत करण्यात आली."
    ],
    WATER: [
      "पाणी गळती शोधून पाईप दुरुस्ती यशस्वीपणे पूर्ण केली आहे.",
      "नळजोडणी व प्रेशरची तपासणी करून पाणीपुरवठा सुरू केला.",
      "दूषित पाण्याचा दोष निवारण करून पाईपलाईन फ्लश केली."
    ],
    DRAINAGE: [
      "गटारातील कचरा व गाळ काढून पाण्याचा निचरा सुरळीत केला आहे.",
      "मॅनहोलचे नवीन सुरक्षा झाकण बसवण्यात आले आहे.",
      "सांडपाणी तुंबण्याची समस्या दूर करण्यात आली आहे."
    ],
    STREET_LIGHT: [
      "बंद पथदिव्याचा दिवा/फिक्स्चर बदलून दिवा सुरू केला आहे.",
      "विद्युत केबल दुरुस्त करून प्रकाश व्यवस्था पूर्ववत केली."
    ],
    ELECTRICITY: [
      "उघडी विद्युत तार सुरक्षित करून धोका पूर्णपणे दूर केला.",
      "विद्युत खांबावरील स्पार्किंग व शॉर्ट सर्किट दुरुस्त केले."
    ],
    OTHER: [
      "संबंधित विभागाने प्रत्यक्ष स्थळ पाहणी करून आवश्यक ती कारवाई केली."
    ]
  },
  hi: {
    GARBAGE: [
      "कचरा हटाकर क्षेत्र को स्वच्छ एवं कीटाणुरहित किया गया।",
      "मृत पशु को नियमानुसार तुरंत हटाकर स्थल का सैनिटाइजेशन पूरा किया गया।",
      "कूड़ेदान को खाली कर आसपास का कचरा साफ किया गया।"
    ],
    ROAD: [
      "सड़क का गड्ढा डामर मिश्रण से भरकर समतल कर दिया गया है।",
      "क्षतिग्रस्त डिवाइडर/फुटपाथ की मरम्मत पूरी कर दी गई है।",
      "सड़क से अवरोध हटाकर यातायात सुचारू कर दिया गया है।"
    ],
    WATER: [
      "पाइपलाइन लीकेज ठीक कर सामान्य जल आपूर्ति बहाल की गई।",
      "पानी का दबाव जांचकर जलापूर्ति सत्यापित की गई।",
      "पाइपलाइन फ्लश कर स्वच्छ पेयजल की आपूर्ति सुनिश्चित की गई।"
    ],
    DRAINAGE: [
      "नाली से कचरा और गाद निकालकर जल निकासी सुचारू की गई।",
      "मैनहोल का नया सुरक्षा ढक्कन लगा दिया गया है।",
      "गंदे पानी का जमाव दूर कर सफाई कार्य पूर्ण किया गया।"
    ],
    STREET_LIGHT: [
      "खराब स्ट्रीट लाइट बदल दी गई है और रोशनी बहाल कर दी गई है।",
      "बिजली का केबल ठीक कर स्ट्रीट लाइट चालू की गई।"
    ],
    ELECTRICITY: [
      "खुले बिजली के तार को सुरक्षित और इन्सुलेट कर दिया गया है।",
      "खंभे की स्पार्किंग व शॉर्ट सर्किट ठीक कर दिया गया है।"
    ],
    OTHER: [
      "संबंधित विभाग द्वारा मौके का निरीक्षण कर आवश्यक कार्रवाई की गई।"
    ]
  }
};

const RATING_OPTIONS = {
  en: [
    { value: 5, label: "⭐⭐⭐⭐⭐ 5 / 5 (Excellent)" },
    { value: 4, label: "⭐⭐⭐⭐ 4 / 5 (Good)" },
    { value: 3, label: "⭐⭐⭐ 3 / 5 (Satisfactory)" },
    { value: 2, label: "⭐⭐ 2 / 5 (Needs Improvement)" },
    { value: 1, label: "⭐ 1 / 5 (Poor)" },
  ],
  mr: [
    { value: 5, label: "⭐⭐⭐⭐⭐ ५ / ५ (पूर्ण समाधान)" },
    { value: 4, label: "⭐⭐⭐⭐ ४ / ५ (चांगले निवारण)" },
    { value: 3, label: "⭐⭐⭐ ३ / ५ (समाधानकारक)" },
    { value: 2, label: "⭐⭐ २ / ५ (सुधारणा आवश्यक)" },
    { value: 1, label: "⭐ १ / ५ (निकृष्ट)" },
  ],
  hi: [
    { value: 5, label: "⭐⭐⭐⭐⭐ 5 / 5 (उत्कृष्ट)" },
    { value: 4, label: "⭐⭐⭐⭐ 4 / 5 (अच्छा)" },
    { value: 3, label: "⭐⭐⭐ 3 / 5 (संतोषजनक)" },
    { value: 2, label: "⭐⭐ 2 / 5 (सुधार आवश्यक)" },
    { value: 1, label: "⭐ 1 / 5 (खराब)" },
  ],
};

const csrfToken = () => {
  const token = document.cookie.split("; ").find((item) => item.startsWith("XSRF-TOKEN="))?.split("=").slice(1).join("=");
  return token ? decodeURIComponent(token) : "";
};

const apiRequest = (url, options = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (method !== "GET" && method !== "HEAD") headers["X-XSRF-TOKEN"] = csrfToken();
  return fetch(url, { ...options, method, headers, credentials: "include" });
};

function App() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const [message, setMessage] = useState("");
  const [backendConnected, setBackendConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [citizenFollowupViews, setCitizenFollowupViews] = useState({});
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [imageFile, setImageFile] = useState(null);
  const [expectedDraftImage, setExpectedDraftImage] = useState(null);
  const submissionKeyRef = useRef(null);
  const attemptedSubmissionKeyRef = useRef(null);
  const duplicateProceedKeyRef = useRef(null);
  const [duplicateReviewSignature, setDuplicateReviewSignature] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalElements: 0, totalPages: 0 });
  const [historyByComplaint, setHistoryByComplaint] = useState({});
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [historyLoadingId, setHistoryLoadingId] = useState(null);
  const [internalNotesByComplaint, setInternalNotesByComplaint] = useState({});
  const [expandedInternalNotesId, setExpandedInternalNotesId] = useState(null);
  const [internalNotesLoadingId, setInternalNotesLoadingId] = useState(null);
  const [internalNoteDrafts, setInternalNoteDrafts] = useState({});
  const [statusReasonDrafts, setStatusReasonDrafts] = useState({});
  const [reopenReasonDrafts, setReopenReasonDrafts] = useState({});
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [complaintActionPending, setComplaintActionPending] = useState("");
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState({});
  const [resolutionEvidenceFiles, setResolutionEvidenceFiles] = useState({});
  const [adminAuditEvents, setAdminAuditEvents] = useState([]);
  const [staffManagementLoading, setStaffManagementLoading] = useState(false);
  const [staffManagementMessage, setStaffManagementMessage] = useState("");
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "", department: "PUBLIC_WORKS", role: "FIELD_STAFF" });
  const [counts, setCounts] = useState({ total: 0, submitted: 0, inProgress: 0, resolved: 0, assigned: 0, overdue: 0, unassigned: 0, slaConfigured: false });
  const [departmentAnalytics, setDepartmentAnalytics] = useState([]);
  const [analyticsMessage, setAnalyticsMessage] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "ALL", category: "ALL", priority: "ALL", sort: "NEWEST" });
  const [intakeLanguage, setIntakeLanguageState] = useState(() => {
    try {
      return localStorage.getItem("civicconnect_language") || "en";
    } catch {
      return "en";
    }
  });
  const setIntakeLanguage = (lang) => {
    setIntakeLanguageState(lang);
    try {
      localStorage.setItem("civicconnect_language", lang);
    } catch {
      // Ignore localStorage errors
    }
  };
  const [classificationSuggestion, setClassificationSuggestion] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [classificationNote, setClassificationNote] = useState("");
  // Wizard form state (step 1=Category&Details, 2=Location&Evidence, 3=Review)
  const [wizardStep, setWizardStep] = useState(1);
  const [trackIdInput, setTrackIdInput] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Top navigation view state: citizen ('lodge' | 'dashboard'), admin ('dashboard' | 'analytics' | 'staff')
  const [activeNavTab, setActiveNavTab] = useState("lodge");

  // Location autocomplete & map state
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const locationSearchTimeoutRef = useRef(null);

  // Production Profile Modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  // Public Complaint Tracker state
  const [publicTrackerOpen, setPublicTrackerOpen] = useState(false);
  const [publicTrackId, setPublicTrackId] = useState("");
  const [authPublicTrackInput, setAuthPublicTrackInput] = useState("");
  const [profilePrefs, setProfilePrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("civicconnect_profile_prefs");
      return saved ? JSON.parse(saved) : { ward: "Naupada-Kopri", smsAlerts: true, whatsappAlerts: true, emailReports: true };
    } catch {
      return { ward: "Naupada-Kopri", smsAlerts: true, whatsappAlerts: true, emailReports: true };
    }
  });

  const updateProfilePref = (key, value) => {
    setProfilePrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem("civicconnect_profile_prefs", JSON.stringify(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

  useEffect(() => {
    if (currentUser?.role !== "ADMIN") {
      return;
    }
    let active = true;
    const loadAnalytics = async () => {
      try {
        const response = await apiRequest(`${ADMIN_URL}/analytics/departments`);
        if (!response.ok) throw new Error(await getApiErrorMessage(response, "Could not load department analytics."));
        const result = await response.json();
        const normalized = normalizeDepartmentAnalytics(result);
        if (normalized.length === 0) throw new Error("Department analytics data is unavailable.");
        if (active) {
          setDepartmentAnalytics(normalized);
          setAnalyticsMessage("");
        }
      } catch (error) {
        if (active) setAnalyticsMessage(error.message || "Could not load department analytics.");
      }
    };
    loadAnalytics();
    return () => { active = false; };
  }, [currentUser]);

  const [formData, setFormData] = useState({ ...EMPTY_COMPLAINT_FORM });
  const [draftNotice, setDraftNotice] = useState("");
  const hydratedDraftUserRef = useRef(null);
  const skipDraftSaveRef = useRef(false);

  const restoreCitizenDraft = useCallback((user) => {
    const isCitizen = user?.role === "CITIZEN";
    hydratedDraftUserRef.current = isCitizen ? user.id : null;
    skipDraftSaveRef.current = isCitizen;
    const savedDraft = isCitizen ? readComplaintDraft(getSessionStorage(), user.id) : null;
    const { submissionKey, submissionImage, ...savedFields } = savedDraft || {};
    setFormData(savedDraft ? savedFields : { ...EMPTY_COMPLAINT_FORM });
    setImageFile(null);
    setExpectedDraftImage(submissionImage || null);
    submissionKeyRef.current = submissionKey
      ? { signature: JSON.stringify({ ...savedFields, image: submissionImage || null }), key: submissionKey }
      : null;
    attemptedSubmissionKeyRef.current = null;
    duplicateProceedKeyRef.current = null;
    setDraftNotice(savedDraft
      ? submissionImage
        ? "Your unfinished complaint was restored. Select the same photo again to retry safely."
        : "Your unfinished complaint was restored. Add its photo again if needed."
      : "");
  }, []);

  const complaintSubmissionSignature = () => JSON.stringify({
    ...formData,
    image: imageFile
      ? [imageFile.name, imageFile.size, imageFile.lastModified, imageFile.type]
      : expectedDraftImage,
  });

  const fetchComplaints = useCallback(async ({ page = currentPage, activeFilters = filters } = {}) => {
    try {
      setLoading(true);
      setMessage("");
      const query = new URLSearchParams({ page: String(page), size: "10" });
      if (activeFilters.search.trim()) query.set("search", activeFilters.search.trim());
      if (activeFilters.status !== "ALL") query.set("status", activeFilters.status);
      if (activeFilters.category !== "ALL") query.set("category", activeFilters.category);
      if (activeFilters.priority !== "ALL") query.set("priority", activeFilters.priority);
      query.set("sort", activeFilters.sort);
      const response = await apiRequest(`${API_URL}?${query.toString()}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to load complaints."));
      const data = await response.json();
      setComplaints(data.complaints);
      setPageInfo({ totalElements: data.totalElements, totalPages: data.totalPages });
      setCounts(data.counts);
      setBackendConnected(true);
      data.complaints.filter((c) => c.status === "RESOLVED").forEach((c) => {
        apiRequest(`${API_URL}/${c.id}/history`)
          .then((res) => (res.ok ? res.json() : null))
          .then((history) => {
            if (history) setHistoryByComplaint((prev) => ({ ...prev, [c.id]: history }));
          })
          .catch(() => {});
      });
    } catch (error) {
      console.error(error);
      setBackendConnected(false);
      setMessage(error.message || "Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  const fetchComplaintsRef = useRef(fetchComplaints);
  useEffect(() => {
    fetchComplaintsRef.current = fetchComplaints;
  }, [fetchComplaints]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await fetch(`${AUTH_URL}/csrf`, { credentials: "include" });
        const response = await apiRequest(`${AUTH_URL}/me`);
        if (response.ok) {
          const user = await response.json();
          restoreCitizenDraft(user);
          setCurrentUser(user);
          setActiveNavTab(user.role === "CITIZEN" ? "lodge" : "dashboard");
          await fetchComplaintsRef.current();
        }
      } catch (error) {
        console.error(error);
      } finally {
        setAuthReady(true);
      }
    };
    restoreSession();
  }, [restoreCitizenDraft]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "CITIZEN" || hydratedDraftUserRef.current !== currentUser.id) return;
    if (skipDraftSaveRef.current) {
      skipDraftSaveRef.current = false;
      return;
    }
    writeComplaintDraft(getSessionStorage(), currentUser.id, formData);
  }, [currentUser, formData]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (authMode === "register") {
      const evaluation = evaluatePassword(authForm.password);
      if (!evaluation.checks.length) {
        setMessage("Password must be at least 10 characters long.");
        return;
      }
      if (!evaluation.checks.notCommon) {
        setMessage("This password is too common and easily guessed.");
        return;
      }
      if (!evaluation.checks.bytes) {
        setMessage("Password must use 72 UTF-8 bytes or fewer.");
        return;
      }
    }
    try {
      const response = await apiRequest(`${AUTH_URL}/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Could not sign in. Check your details and try again."));
      }
      const user = await response.json();
      restoreCitizenDraft(user);
      setCurrentUser(user);
      setActiveNavTab(user.role === "CITIZEN" ? "lodge" : "dashboard");
      setAuthForm({ name: "", email: "", password: "" });
      await fetchComplaints();
    } catch (error) {
      setMessage(error.message || "Could not connect to the server.");
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest(`${AUTH_URL}/logout`, { method: "POST" });
    } finally {
      if (currentUser?.role === "CITIZEN") clearComplaintDraft(getSessionStorage(), currentUser.id);
      setFormData({ ...EMPTY_COMPLAINT_FORM });
      setDraftNotice("");
      setExpectedDraftImage(null);
      setCurrentUser(null);
      setProfileModalOpen(false);
      setComplaints([]);
      setStaffAccounts([]);
      setDepartmentAnalytics([]);
      setAnalyticsMessage("");
      setAuthForm({ name: "", email: "", password: "" });
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraftNotice("");

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleLocationInputChange = (event) => {
    const val = event.target.value;
    setDraftNotice("");
    setFormData((prev) => ({ ...prev, location: val }));

    if (locationSearchTimeoutRef.current) {
      clearTimeout(locationSearchTimeoutRef.current);
    }

    if (!val || val.trim().length === 0) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return;
    }

    setLocationSearching(true);
    locationSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchThaneLocations(val);
        setLocationSuggestions(results);
        setShowLocationDropdown(results.length > 0);
      } finally {
        setLocationSearching(false);
      }
    }, 200);
  };

  const handleSelectLocationSuggestion = (loc) => {
    setFormData((prev) => ({
      ...prev,
      location: `${loc.name}, ${loc.area}`,
      latitude: String(loc.lat),
      longitude: String(loc.lon),
    }));
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
    setMessage(`📍 Selected: ${loc.name}. Pinned on map.`);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Location services are not available in this browser.");
      return;
    }
    setMessage("📍 Requesting device GPS coordinates…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lon = coords.longitude;
        setFormData((previous) => ({
          ...previous,
          latitude: String(lat),
          longitude: String(lon),
        }));
        try {
          const address = await reverseGeocodeThane(lat, lon);
          if (address) {
            setFormData((previous) => ({ ...previous, location: address }));
            setMessage(`✅ Pinned to current location: ${address}`);
          } else {
            setMessage("✅ Device GPS coordinates pinned to map.");
          }
        } catch {
          setMessage("✅ Device GPS coordinates pinned to map.");
        }
      },
      () => setMessage("Could not get your location. Choose from the Thane area suggestions instead."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && expectedDraftImage) {
      const selectedImage = [file.name, file.size, file.lastModified, file.type];
      if (JSON.stringify(selectedImage) !== JSON.stringify(expectedDraftImage)) {
        setMessage("Select the same photo that was attached to this saved complaint before retrying.");
        event.target.value = "";
        return;
      }
      setExpectedDraftImage(null);
    }
    if (file && !["image/jpeg", "image/png"].includes(file.type)) {
      setMessage("Choose a valid JPG or PNG image.");
      setImageFile(null);
      event.target.value = "";
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setMessage("Choose an image that is 5 MB or smaller.");
      setImageFile(null);
      event.target.value = "";
      return;
    }
    setImageFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.location.trim()
    ) {
      setMessage("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);

      const submissionSignature = complaintSubmissionSignature();
      if (submissionKeyRef.current?.signature !== submissionSignature) {
        submissionKeyRef.current = { signature: submissionSignature, key: crypto.randomUUID() };
        writeComplaintDraft(getSessionStorage(), currentUser.id, {
          ...formData,
          submissionKey: submissionKeyRef.current.key,
          submissionImage: imageFile ? [imageFile.name, imageFile.size, imageFile.lastModified, imageFile.type] : null,
        });
        attemptedSubmissionKeyRef.current = null;
        duplicateProceedKeyRef.current = null;
      }

      const submissionKey = submissionKeyRef.current.key;
      if (attemptedSubmissionKeyRef.current !== submissionKey && duplicateProceedKeyRef.current !== submissionKey) {
        const duplicateCheck = await apiRequest(`${API_URL}/possible-duplicates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            location: formData.location,
            latitude: formData.latitude === "" ? null : Number(formData.latitude),
            longitude: formData.longitude === "" ? null : Number(formData.longitude),
          }),
        });
        if (duplicateCheck.ok) {
          const duplicateResult = await duplicateCheck.json();
          if (duplicateResult.possibleMatch) {
            setDuplicateReviewSignature(submissionSignature);
            return;
          }
        }
      }
      setDuplicateReviewSignature(null);

      const complaintPayload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) complaintPayload.append(key, value);
      });
      if (imageFile) complaintPayload.append("image", imageFile);

      attemptedSubmissionKeyRef.current = submissionKey;
      const response = await apiRequest(API_URL, {
        method: "POST",
        headers: { "Idempotency-Key": submissionKey },
        body: complaintPayload,
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Your session expired. Sign in again, then retry this complaint.");
        if (response.status === 403) throw new Error("Your account is not allowed to submit complaints.");
        if ([400, 413, 415].includes(response.status)) {
          throw new Error(await getApiErrorMessage(response, "Check the complaint details, GPS coordinates, and photo format or size, then retry."));
        }
        if (response.status >= 500) throw new Error("The server could not save this complaint. Your form is still here; retrying will not create a duplicate.");
        throw new Error("The complaint could not be submitted. Your form is still here; review it and retry.");
      }

      const createdComplaint = await response.json();

      setCurrentPage(0);
      await fetchComplaints({ page: 0 });

      setFormData({ ...EMPTY_COMPLAINT_FORM });
      setWizardStep(1);
      clearComplaintDraft(getSessionStorage(), currentUser.id);
      setDraftNotice("");
      submissionKeyRef.current = null;
      attemptedSubmissionKeyRef.current = null;
      duplicateProceedKeyRef.current = null;
      setDuplicateReviewSignature(null);
      setImageFile(null);
      setExpectedDraftImage(null);
      const imageInput = document.getElementById("evidence-image");
      if (imageInput) imageInput.value = "";

      setMessage(`Complaint submitted successfully. Reference number: ${createdComplaint.complaintNumber}.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof TypeError
        ? "The connection failed. Your form is still here; retrying will use the same submission key."
        : error.message || "The complaint could not be submitted. Your form is still here; retry it shortly.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setMessage("");
      const reason = statusReasonDrafts[id]?.trim();
      const currentComplaint = complaints.find((complaint) => complaint.id === id);
      if (currentComplaint?.status === "REOPEN_REQUESTED" && !reason) {
        setMessage("Add a decision note before responding to this reopening request.");
        return;
      }
      if (status === "RESOLVED" && !reason) {
        setMessage("Add a public resolution note before resolving this complaint.");
        return;
      }
      setComplaintActionPending(`${id}-${status}`);
      const params = new URLSearchParams({ status });
      if (reason) params.set("reason", reason);

      const response = await apiRequest(
        `${API_URL}/${id}/status?${params.toString()}`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Failed to update complaint status."));
      }

      await response.json();
      setHistoryByComplaint((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      setStatusReasonDrafts((previous) => ({ ...previous, [id]: "" }));
      await fetchComplaints();
      setMessage(`Complaint status updated to ${status.replace("_", " ")}.`);
    } catch (error) {
      console.error(error);
      setMessage("Unable to update complaint status.");
    } finally {
      setComplaintActionPending("");
    }
  };

  const resolveWithATR = async (id) => {
    try {
      setMessage("");
      const reason = statusReasonDrafts[id]?.trim();
      const currentComplaint = complaints.find((complaint) => complaint.id === id);
      if (!reason) {
        setMessage("Please provide official Action Taken Report (ATR) remarks before resolving.");
        return;
      }
      setComplaintActionPending(`${id}-resolve-atr`);

      const imageFile = resolutionEvidenceFiles[id];
      if (imageFile) {
        const evidenceData = new FormData();
        evidenceData.append("image", imageFile);
        const imgResponse = await apiRequest(`${API_URL}/${id}/resolution-evidence`, {
          method: "POST",
          body: evidenceData,
        });
        if (!imgResponse.ok) {
          throw new Error(await getApiErrorMessage(imgResponse, "Could not upload resolution evidence photo."));
        }
      }

      const params = new URLSearchParams({ status: "RESOLVED", reason });
      const statusResponse = await apiRequest(`${API_URL}/${id}/status?${params.toString()}`, {
        method: "PUT",
      });
      if (!statusResponse.ok) {
        throw new Error(await getApiErrorMessage(statusResponse, "Failed to resolve complaint."));
      }

      setStatusReasonDrafts((prev) => ({ ...prev, [id]: "" }));
      setResolutionEvidenceFiles((prev) => ({ ...prev, [id]: null }));
      setHistoryByComplaint((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await fetchComplaints();
      setMessage(`Official Action Taken Report (ATR) submitted successfully. Grievance #${currentComplaint?.complaintNumber || id} marked RESOLVED.`);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Failed to submit Action Taken Report.");
    } finally {
      setComplaintActionPending("");
    }
  };

  const toggleHistory = async (id) => {
    if (expandedHistoryId === id) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(id);
    if (Object.prototype.hasOwnProperty.call(historyByComplaint, id)) return;
    setHistoryLoadingId(id);
    try {
      const response = await apiRequest(`${API_URL}/${id}/history`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Could not load complaint history."));
      const history = await response.json();
      setHistoryByComplaint((previous) => ({ ...previous, [id]: history }));
    } catch (error) {
      console.error(error);
      setMessage("Unable to load this complaint's update history.");
      setExpandedHistoryId(null);
    } finally {
      setHistoryLoadingId(null);
    }
  };

  const toggleInternalNotes = async (id) => {
    if (expandedInternalNotesId === id) {
      setExpandedInternalNotesId(null);
      return;
    }
    setExpandedInternalNotesId(id);
    if (Object.prototype.hasOwnProperty.call(internalNotesByComplaint, id)) return;
    setInternalNotesLoadingId(id);
    try {
      const response = await apiRequest(`${API_URL}/${id}/internal-notes`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Could not load internal notes."));
      const notes = await response.json();
      setInternalNotesByComplaint((previous) => ({ ...previous, [id]: notes }));
    } catch (error) {
      console.error(error);
      setMessage("Unable to load internal notes for this complaint.");
      setExpandedInternalNotesId(null);
    } finally {
      setInternalNotesLoadingId(null);
    }
  };

  const addInternalNote = async (event, id) => {
    event.preventDefault();
    const body = internalNoteDrafts[id]?.trim();
    if (!body) return;
    setComplaintActionPending(`${id}-internal-note`);
    try {
      const response = await apiRequest(`${API_URL}/${id}/internal-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Could not save internal note."));
      const saved = await response.json();
      setInternalNotesByComplaint((previous) => ({
        ...previous,
        [id]: [...(previous[id] || []), saved],
      }));
      setInternalNoteDrafts((previous) => ({ ...previous, [id]: "" }));
    } catch (error) {
      setMessage(error.message || "Could not save the internal note.");
    } finally {
      setComplaintActionPending("");
    }
  };

  const submitReopenRequest = async (id) => {
    const reason = reopenReasonDrafts[id]?.trim();
    if (!reason) {
      setMessage("Explain why the resolved complaint should be reopened.");
      return;
    }
    setComplaintActionPending(`${id}-appeal`);
    try {
      const response = await apiRequest(`${API_URL}/${id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Could not submit the reopening request."));
      setReopenReasonDrafts((previous) => ({ ...previous, [id]: "" }));
      await fetchComplaints();
      setMessage("Your reopening request was sent for department review.");
    } catch (error) {
      setMessage(error.message || "Could not submit the reopening request.");
    } finally {
      setComplaintActionPending("");
    }
  };

  const submitFeedback = async (id) => {
    const feedback = feedbackDrafts[id] || { rating: 5, feedback: "" };
    setComplaintActionPending(`${id}-feedback`);
    try {
      const response = await apiRequest(`${API_URL}/${id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedback),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Could not save your feedback."));
      await fetchComplaints();
      setMessage("Thank you. Your feedback has been recorded.");
    } catch (error) {
      setMessage(error.message || "Could not save your feedback.");
    } finally {
      setComplaintActionPending("");
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setMessage("");
    setProfileSaving(true);
    try {
      const response = await apiRequest(`${AUTH_URL}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Could not update your profile."));
      }
      const user = await response.json();
      setCurrentUser(user);
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error.message || "Could not connect to the server.");
    } finally {
      setProfileSaving(false);
    }
  };

  const loadStaffManagement = async () => {
    setStaffManagementLoading(true);
    try {
      const [staffResponse, auditResponse] = await Promise.all([
        apiRequest(`${ADMIN_URL}/staff`),
        apiRequest(`${ADMIN_URL}/audit?page=0&size=10`),
      ]);
      if (!staffResponse.ok) throw new Error(await getApiErrorMessage(staffResponse, "Could not load staff accounts."));
      if (!auditResponse.ok) throw new Error(await getApiErrorMessage(auditResponse, "Could not load the admin audit log."));
      const [staff, audit] = await Promise.all([staffResponse.json(), auditResponse.json()]);
      setStaffAccounts(staff);
      setAdminAuditEvents(audit.events);
    } catch (error) {
      setStaffManagementMessage(error.message || "Could not load staff management data.");
    } finally {
      setStaffManagementLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role !== "ADMIN") return undefined;
    let active = true;
    apiRequest(`${ADMIN_URL}/staff`).then(async (response) => {
      if (response.ok && active) setStaffAccounts(await response.json());
    }).catch((error) => console.error("Could not load staff choices", error));
    return () => { active = false; };
  }, [currentUser]);

  const updateComplaintAssignment = async (complaintId) => {
    const draft = assignmentDrafts[complaintId];
    if (!draft?.reason?.trim()) {
      setMessage("Add a reason before changing the complaint assignment.");
      return;
    }
    setComplaintActionPending(`assignment-${complaintId}`);
    try {
      const response = await apiRequest(`${ADMIN_URL}/complaints/${complaintId}/assignment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: draft.staffId === "" ? null : Number(draft.staffId), reason: draft.reason.trim() }),
      });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Could not update the complaint assignment."));
      }
      setAssignmentDrafts((previous) => {
        const next = { ...previous };
        delete next[complaintId];
        return next;
      });
      await fetchComplaints();
      setMessage("Complaint assignment updated.");
    } catch (error) {
      setMessage(error.message || "Could not update the complaint assignment.");
    } finally {
      setComplaintActionPending("");
    }
  };

  const createStaffAccount = async (event) => {
    event.preventDefault();
    setStaffManagementMessage("");
    setStaffManagementLoading(true);
    try {
      const response = await apiRequest(`${ADMIN_URL}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Could not create staff account."));
      }
      setStaffForm({ name: "", email: "", password: "", department: "PUBLIC_WORKS", role: "FIELD_STAFF" });
      await loadStaffManagement();
      setStaffManagementMessage("Staff account created.");
    } catch (error) {
      setStaffManagementMessage(error.message || "Could not create staff account.");
    } finally {
      setStaffManagementLoading(false);
    }
  };

  const updateStaffAccount = async (id, path, body) => {
    setStaffManagementMessage("");
    try {
      const response = await apiRequest(`${ADMIN_URL}/staff/${id}/${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Could not update staff account."));
      await loadStaffManagement();
      setStaffManagementMessage("Staff account updated.");
    } catch (error) {
      setStaffManagementMessage(error.message || "Could not update staff account.");
    }
  };

  const getStatusClass = (status) => {
    if (status === "RESOLVED") {
      return "status resolved";
    }
    if (status === "REOPEN_REQUESTED") {
      return "status appeal";
    }

    if (status === "IN_PROGRESS") {
      return "status progress";
    }

    return "status submitted";
  };

  const getPriorityClass = (priority) => {
    if (priority === "HIGH") {
      return "priority high";
    }

    if (priority === "LOW") {
      return "priority low";
    }

    return "priority medium";
  };

  const intakeCopy = getIntakeCopy(intakeLanguage);
  const authCopy = getAuthCopy(intakeLanguage);
  const uiCopy = getUiCopy(intakeLanguage);

  const formatStatus = (status) => {
    switch (status) {
      case "SUBMITTED": return uiCopy.statusLabelSubmitted || "Submitted";
      case "IN_PROGRESS": return uiCopy.statusLabelInProgress || "In Progress";
      case "RESOLVED": return uiCopy.statusLabelResolved || "Resolved";
      case "REOPEN_REQUESTED": return uiCopy.statusLabelReopenRequested || "Reopening requested";
      default:
        return status
          ? status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
          : "";
    }
  };

  const formatCategory = (category) => {
    return intakeCopy.categories[category] || (category
      ? category.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
      : "");
  };

  const formatPriority = (priority) => {
    return intakeCopy.priorities[priority] || priority;
  };

  const formatDepartment = (dept) => {
    return uiCopy.departments?.[dept] || dept?.replaceAll("_", " ") || uiCopy.allotted || "Allotted";
  };

  const formatRoleLocalized = (role) => {
    return uiCopy.roles?.[role] || formatRole(role);
  };

  const hasActiveFilters = filters.search.trim() !== "" || filters.status !== "ALL" || filters.category !== "ALL" || filters.priority !== "ALL";
  const totalComplaints = counts.total;
  const submittedComplaints = counts.submitted;
  const inProgressComplaints = counts.inProgress;
  const resolvedComplaints = counts.resolved;
  const visibleComplaints = complaints;

  const handleRequestClassification = async () => {
    if (!formData.title?.trim() || !formData.description?.trim()) {
      setClassificationNote("Please provide a title and description first.");
      return;
    }
    setClassifying(true);
    setClassificationNote("");
    try {
      const response = await apiRequest(`${API_URL}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          location: formData.location?.trim() || "Thane",
        }),
      });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Classification request could not be completed."));
      }
      const data = await response.json();
      if (data.status === "RECOMMENDATION_AVAILABLE" || data.status === "MANUAL_REVIEW_REQUIRED") {
        setClassificationSuggestion(data);
      } else {
        setClassificationSuggestion(null);
        setClassificationNote(data.explanation || "Classification unavailable. Please select category and priority manually.");
      }
    } catch (error) {
      setClassificationSuggestion(null);
      setClassificationNote(error.message || "Classification unavailable.");
    } finally {
      setClassifying(false);
    }
  };

  const applyClassificationSuggestion = () => {
    if (!classificationSuggestion) return;
    setFormData((prev) => ({
      ...prev,
      category: classificationSuggestion.category || prev.category,
      priority: classificationSuggestion.priority || prev.priority,
    }));
    setClassificationSuggestion(null);
  };

  const updateFilter = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    setCurrentPage(0);
    fetchComplaints({ page: 0, activeFilters: nextFilters });
  };

  const changePage = (page) => {
    setCurrentPage(page);
    fetchComplaints({ page });
  };

  const exportComplaints = async () => {
    setExportPending(true);
    try {
      const query = new URLSearchParams();
      if (filters.search.trim()) query.set("search", filters.search.trim());
      if (filters.status !== "ALL") query.set("status", filters.status);
      if (filters.category !== "ALL") query.set("category", filters.category);
      if (filters.priority !== "ALL") query.set("priority", filters.priority);
      query.set("sort", filters.sort);
      const response = await apiRequest(`${ADMIN_URL}/complaints/export.csv?${query.toString()}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "The complaint export could not be downloaded."));
      const downloadUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "civicconnect-complaints.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setMessage("Filtered complaint export downloaded.");
    } catch (error) {
      setMessage(error.message || "The complaint export could not be downloaded.");
    } finally {
      setExportPending(false);
    }
  };

  if (!authReady) {
    return <main className="auth-page"><div className="auth-card"><h1>{uiCopy.brandTitle}</h1><p>{uiCopy.loading}</p></div></main>;
  }

  if (!currentUser) {
    return (
      <main className="auth-page" lang={intakeLanguage}>
        {publicTrackerOpen && publicTrackId && (
          <PublicTrackerModal
            complaintNumber={publicTrackId}
            apiRoot={API_ROOT}
            uiCopy={uiCopy}
            onClose={() => setPublicTrackerOpen(false)}
            onNavigateAuth={() => {
              setPublicTrackerOpen(false);
              setAuthMode("register");
            }}
          />
        )}

        <div className="auth-container-grid">
          {/* Public Complaint Tracker without Login */}
          <section className="auth-card tracker-spotlight-card">
            <div className="brand-mark auth-mark" style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" }}>
              🔍
            </div>
            <p className="section-label">NO LOGIN REQUIRED</p>
            <h2>{uiCopy.trackGrievanceHeading || "Public Grievance Tracker"}</h2>
            <p className="card-description">
              {uiCopy.trackGrievanceDesc || "Track your grievance status & Action Taken Report in real time without signing in."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (authPublicTrackInput.trim()) {
                  setPublicTrackId(authPublicTrackInput.trim());
                  setPublicTrackerOpen(true);
                }
              }}
              style={{ marginTop: 16 }}
            >
              <div className="form-group">
                <label htmlFor="auth-track-ref">Grievance Reference ID</label>
                <input
                  id="auth-track-ref"
                  type="text"
                  required
                  placeholder={uiCopy.trackInputPlaceholder || "Enter Reference # (e.g. TMC-E4A8D0...)"}
                  value={authPublicTrackInput}
                  onChange={(e) => setAuthPublicTrackInput(e.target.value)}
                  style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
                />
              </div>
              <button className="submit-button" type="submit" style={{ background: "var(--navy-800)" }}>
                🔍 {uiCopy.btnTrack || "Track Grievance"}
              </button>
            </form>
            <div style={{ marginTop: 16, fontSize: "0.8rem", color: "var(--gray-500)", borderTop: "1px dashed var(--gray-200)", paddingTop: 12 }}>
              <span>💡 Check real-time progress, officer inspection notes, and resolved ATR photos with your TMC tracking receipt.</span>
            </div>
          </section>

          {/* Citizen & Officer Sign-In/Register */}
          <section className="auth-card">
            <div className="brand-mark auth-mark">TMC</div>
            <p className="section-label">{uiCopy.brandSubtitle.toUpperCase()}</p>
            <div className="form-group auth-language">
              <label htmlFor="auth-language">{authCopy.language}</label>
              <select id="auth-language" value={intakeLanguage} onChange={(event) => setIntakeLanguage(event.target.value)}>
                {INTAKE_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
              </select>
            </div>
            <h1>{authMode === "login" ? authCopy.welcomeBack : authCopy.createAccountHeading}</h1>
            <p className="card-description">{authMode === "login" ? authCopy.loginDescription : authCopy.registerDescription}</p>
            {message && <div className="message" role="alert">{message}</div>}
            <form onSubmit={handleAuthSubmit}>
              {authMode === "register" && <div className="form-group"><label htmlFor="auth-name">{authCopy.fullName}</label><input id="auth-name" required maxLength="100" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} /></div>}
              <div className="form-group"><label htmlFor="auth-email">{authCopy.email}</label><input id="auth-email" type="email" required maxLength="190" autoComplete="username" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></div>
              <div className="form-group">
                <label htmlFor="auth-password">{authCopy.password}</label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={authMode === "register" ? 10 : 1}
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                />
                {authMode === "register" && <PasswordStrengthMeter password={authForm.password} />}
              </div>
              <button className="submit-button" type="submit">{authMode === "login" ? authCopy.signIn : authCopy.createAccount}</button>
            </form>
            <button className="text-button" onClick={() => { setMessage(""); setAuthMode(authMode === "login" ? "register" : "login"); }}>
              {authMode === "login" ? authCopy.switchToRegister : authCopy.switchToLogin}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">{uiCopy.skipToContent}</a>
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-mark">TMC</div>

            <div>
              <h1>{uiCopy.brandTitle}</h1>
              <p>{uiCopy.brandSubtitle}</p>
            </div>
          </div>

          <nav className="header-nav" aria-label="Portal Navigation">
            {currentUser.role === "CITIZEN" ? (
              <>
                <button
                  type="button"
                  className={`nav-tab-btn ${activeNavTab === "lodge" ? "active" : ""}`}
                  onClick={() => setActiveNavTab("lodge")}
                >
                  <span>📝</span>
                  <span>{intakeCopy.heading || "Lodge Grievance"}</span>
                </button>
                <button
                  type="button"
                  className={`nav-tab-btn ${activeNavTab === "dashboard" ? "active" : ""}`}
                  onClick={() => setActiveNavTab("dashboard")}
                >
                  <span>🔍</span>
                  <span>{uiCopy.dashboardHeading || "My Grievances"}</span>
                  {complaints.length > 0 && <span className="nav-tab-badge">{complaints.length}</span>}
                </button>
                <button
                  type="button"
                  className={`nav-tab-btn ${activeNavTab === "map" ? "active" : ""}`}
                  onClick={() => setActiveNavTab("map")}
                >
                  <span>🗺️</span>
                  <span>{uiCopy.navWardMap || "Ward Map"}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`nav-tab-btn ${activeNavTab === "dashboard" ? "active" : ""}`}
                  onClick={() => setActiveNavTab("dashboard")}
                >
                  <span>📋</span>
                  <span>{isDepartmentEmployee(currentUser.role) ? uiCopy.departmentQueue : "Complaints Queue"}</span>
                  {complaints.length > 0 && <span className="nav-tab-badge">{complaints.length}</span>}
                </button>
                <button
                  type="button"
                  className={`nav-tab-btn ${activeNavTab === "map" ? "active" : ""}`}
                  onClick={() => setActiveNavTab("map")}
                >
                  <span>🗺️</span>
                  <span>{uiCopy.navWardMap || "Ward Map"}</span>
                </button>
                {currentUser.role === "ADMIN" && (
                  <>
                    <button
                      type="button"
                      className={`nav-tab-btn ${activeNavTab === "analytics" ? "active" : ""}`}
                      onClick={() => setActiveNavTab("analytics")}
                    >
                      <span>📊</span>
                      <span>{uiCopy.departmentWorkload || "Analytics"}</span>
                    </button>
                    <button
                      type="button"
                      className={`nav-tab-btn ${activeNavTab === "staff" ? "active" : ""}`}
                      onClick={() => {
                        setActiveNavTab("staff");
                        loadStaffManagement();
                      }}
                    >
                      <span>👥</span>
                      <span>{uiCopy.manageStaff || "Staff"}</span>
                    </button>
                  </>
                )}
              </>
            )}
          </nav>

          <div className="account-actions">
            <div className={`backend-status ${backendConnected ? "connected" : "disconnected"}`}>
              <span className="status-dot"></span>
              {backendConnected ? uiCopy.connected : uiCopy.disconnected}
            </div>
            <div className="header-language-select">
              <label htmlFor="header-language" className="visually-hidden">{uiCopy.language}</label>
              <select
                id="header-language"
                value={intakeLanguage}
                onChange={(event) => setIntakeLanguage(event.target.value)}
                aria-label={uiCopy.language}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            <span className="account-name">{currentUser.name} · {currentUser.role === "ADMIN" ? uiCopy.administrator : isDepartmentEmployee(currentUser.role) ? `${formatRoleLocalized(currentUser.role)} · ${formatDepartment(currentUser.department)}` : uiCopy.citizen}</span>
            <button className="profile-button" onClick={() => { setProfileName(currentUser.name); setProfileModalOpen(true); }} aria-expanded={profileModalOpen}>
              👤 {uiCopy.profile}
            </button>
            <button className="logout-button" onClick={handleLogout}>{uiCopy.signOut}</button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex="-1">
        {currentUser.role === "ADMIN" && activeNavTab === "staff" && <div className="container" style={{ paddingTop: 24 }}><section className="card staff-management" aria-labelledby="staff-heading">
          <div className="staff-management-heading">
            <div>
              <p className="section-label">{uiCopy.administrationLabel}</p>
              <h2 id="staff-heading">{uiCopy.departmentStaff}</h2>
              <p className="card-description">{uiCopy.departmentStaffDesc}</p>
            </div>
            <button className="refresh-button" type="button" onClick={loadStaffManagement} disabled={staffManagementLoading}>{uiCopy.refreshLabel}</button>
          </div>
          {staffManagementMessage && <div className="message" role="status">{staffManagementMessage}</div>}
          <form className="staff-create-form" onSubmit={createStaffAccount}>
            <div className="form-group"><label htmlFor="staff-name">{uiCopy.staffFullName}</label><input id="staff-name" required maxLength="100" value={staffForm.name} onChange={(event) => setStaffForm((previous) => ({ ...previous, name: event.target.value }))} /></div>
            <div className="form-group"><label htmlFor="staff-email">{uiCopy.staffEmail}</label><input id="staff-email" type="email" required maxLength="190" value={staffForm.email} onChange={(event) => setStaffForm((previous) => ({ ...previous, email: event.target.value }))} /></div>
            <div className="form-group"><label htmlFor="staff-password">{uiCopy.staffTempPassword}</label><input id="staff-password" type="password" required minLength="8" maxLength="72" autoComplete="new-password" value={staffForm.password} onChange={(event) => setStaffForm((previous) => ({ ...previous, password: event.target.value }))} /></div>
            <div className="form-group"><label htmlFor="staff-department">{uiCopy.staffDepartment}</label>
              <select id="staff-department" value={staffForm.department} onChange={(event) => setStaffForm((previous) => ({ ...previous, department: event.target.value }))}>
                {["PUBLIC_WORKS", "SOLID_WASTE", "WATER", "SEWERAGE", "STREET_LIGHTING", "OTHER"].map((department) => <option value={department} key={department}>{formatDepartment(department)}</option>)}
              </select>
            </div>
            <div className="form-group"><label htmlFor="staff-role">{uiCopy.staffRole}</label>
              <select id="staff-role" value={staffForm.role} onChange={(event) => setStaffForm((previous) => ({ ...previous, role: event.target.value }))}>
                {EMPLOYEE_ROLES.map((role) => <option value={role} key={role}>{formatRoleLocalized(role)}</option>)}
              </select>
            </div>
            <button className="submit-button" type="submit" disabled={staffManagementLoading}>{uiCopy.createStaffAccount}</button>
          </form>
          {staffManagementLoading ? <p>{uiCopy.loadingStaff}</p> : staffAccounts.length === 0 ? <p>{uiCopy.noStaffYet}</p> :
            <div className="staff-account-list">
              {staffAccounts.map((staff) => <div className="staff-account-row" key={staff.id}>
                <div><strong>{staff.name}</strong><span>{staff.email}</span><span>{formatRoleLocalized(staff.role)} · {staff.active ? uiCopy.activeLabel : uiCopy.deactivatedLabel}</span></div>
                <label htmlFor={`staff-role-${staff.id}`}>{uiCopy.roleLabel}</label>
                <select id={`staff-role-${staff.id}`} value={staff.role || "STAFF"}
                  onChange={(event) => updateStaffAccount(staff.id, "role", { role: event.target.value })}>
                  {EMPLOYEE_ROLES.map((role) => <option value={role} key={role}>{formatRoleLocalized(role)}</option>)}
                </select>
                <label htmlFor={`staff-department-${staff.id}`}>{uiCopy.departmentLabel}</label>
                <select id={`staff-department-${staff.id}`} value={staff.department || "OTHER"}
                  onChange={(event) => updateStaffAccount(staff.id, "department", { department: event.target.value })}>
                  {["PUBLIC_WORKS", "SOLID_WASTE", "WATER", "SEWERAGE", "STREET_LIGHTING", "OTHER"].map((department) => <option value={department} key={department}>{formatDepartment(department)}</option>)}
                </select>
                <button className="text-button" type="button" disabled={staffManagementLoading}
                  onClick={() => updateStaffAccount(staff.id, "active", { active: !staff.active })}>{staff.active ? uiCopy.deactivate : uiCopy.activate}</button>
              </div>)}
            </div>}
          <details className="admin-audit-list">
            <summary>{uiCopy.recentAdminChanges}</summary>
            {adminAuditEvents.length ? <ul>{adminAuditEvents.map((event) => <li key={event.id}>
              <strong>{event.action.replaceAll("_", " ")}</strong> · {event.actorEmail} · {new Date(event.createdAt).toLocaleString()}
              {event.details && <span> — {event.details}</span>}
            </li>)}</ul> : <p>{uiCopy.noAdminChanges}</p>}
          </details>
        </section></div>}
        {/* ── Hero Band ─────────────────────────────── */}
        <section className="hero-band" aria-label="Quick actions">
          <div className="container">
            <div className="hero-text">
              <p className="hero-label">
                {currentUser.role === "ADMIN" ? uiCopy.adminServices
                  : isDepartmentEmployee(currentUser.role)
                    ? `${formatRoleLocalized(currentUser.role).toUpperCase()} · ${uiCopy.departmentWorkspace}`
                    : uiCopy.citizenServices}
              </p>
              <h2>
                {currentUser.role === "ADMIN" ? uiCopy.adminHeading
                  : isDepartmentEmployee(currentUser.role) ? uiCopy.departmentQueue
                  : uiCopy.reportIssue}
              </h2>
              <p>{uiCopy.heroDescription}</p>

              {/* Quick-action cards — only for citizens */}
              {currentUser.role === "CITIZEN" && (
                <div className="hero-actions" role="group" aria-label="Primary actions">
                  <div className="quick-action-card">
                    <h3>📝 {intakeCopy.heading}</h3>
                    <p>{intakeCopy.intro}</p>
                    <button
                      className="submit-button btn-accent"
                      style={{ height: 40, fontSize: 14 }}
                      onClick={() => {
                        setActiveNavTab("lodge");
                        setWizardStep(1);
                        document.getElementById("complaint-form-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      {intakeCopy.submit}
                    </button>
                  </div>
                  <div className="quick-action-card">
                    <h3>🔍 {uiCopy.dashboardHeading}</h3>
                    <p>{uiCopy.searchPlaceholder}</p>
                    <div className="track-bar" role="search">
                      <label htmlFor="track-id-input" className="visually-hidden">{uiCopy.searchPlaceholder}</label>
                      <input
                        id="track-id-input"
                        type="text"
                        placeholder="e.g. TMC-E4A8D0... or search area"
                        value={trackIdInput}
                        onChange={(e) => setTrackIdInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && trackIdInput.trim()) {
                            const q = trackIdInput.trim();
                            if (q.toUpperCase().startsWith("TMC-")) {
                              setPublicTrackId(q.toUpperCase());
                              setPublicTrackerOpen(true);
                            } else {
                              setFilters(f => ({ ...f, search: q }));
                              fetchComplaints({ page: 0, activeFilters: { ...filters, search: q } });
                              setActiveNavTab("dashboard");
                            }
                            setTrackIdInput("");
                          }
                        }}
                      />
                      <button
                        className="btn-track"
                        onClick={() => {
                          if (!trackIdInput.trim()) {
                            setActiveNavTab("dashboard");
                            return;
                          }
                          const q = trackIdInput.trim();
                          if (q.toUpperCase().startsWith("TMC-")) {
                            setPublicTrackId(q.toUpperCase());
                            setPublicTrackerOpen(true);
                          } else {
                            setFilters(f => ({ ...f, search: q }));
                            fetchComplaints({ page: 0, activeFilters: { ...filters, search: q } });
                            setActiveNavTab("dashboard");
                          }
                          setTrackIdInput("");
                        }}
                      >
                        {uiCopy.btnTrack || uiCopy.refresh}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Page Body ──────────────────────────────── */}
        <div className="page-body">
        <div className="container">

        {message && (
          <div className="message" role="alert" aria-live="polite">
            {message}
          </div>
        )}

        {/* ── Stat Pills ──────────────────────────────── */}
        <div className="stats-strip" role="region" aria-label="Complaint statistics">
          <div className="stat-pill">
            <div className="stat-value">{totalComplaints}</div>
            <div className="stat-label">{uiCopy.totalComplaints}</div>
          </div>
          <div className="stat-pill">
            <div className="stat-value">{submittedComplaints}</div>
            <div className="stat-label">{uiCopy.submitted}</div>
          </div>
          <div className="stat-pill">
            <div className="stat-value">{inProgressComplaints}</div>
            <div className="stat-label">{uiCopy.inProgress}</div>
          </div>
          <div className="stat-pill resolved">
            <div className="stat-value">{resolvedComplaints}</div>
            <div className="stat-label">{uiCopy.resolved}</div>
          </div>
          {(currentUser.role === "ADMIN" || isDepartmentEmployee(currentUser.role)) && <>
            <div className="stat-pill">
              <div className="stat-value">{counts.assigned}</div>
              <div className="stat-label">{uiCopy.assignedActive}</div>
            </div>
            <div className="stat-pill overdue">
              <div className="stat-value">{counts.overdue}</div>
              <div className="stat-label">{uiCopy.overdue}{!counts.slaConfigured && <span title={uiCopy.targetsNotConfigured}> ⚠️</span>}</div>
            </div>
            <div className="stat-pill">
              <div className="stat-value">{counts.unassigned}</div>
              <div className="stat-label">{uiCopy.unassigned}</div>
            </div>
          </>}
        </div>

        {currentUser.role === "ADMIN" && activeNavTab === "analytics" && <section className="card department-analytics" aria-labelledby="department-analytics-heading">
          <div className="card-header">
            <div>
              <p className="section-label">{uiCopy.reportingLabel}</p>
              <h2 id="department-analytics-heading">{uiCopy.departmentWorkload}</h2>
              <p className="card-description">{uiCopy.departmentWorkloadDesc}</p>
            </div>
          </div>
          {analyticsMessage && <p className="message" role="status">{analyticsMessage}</p>}
          {departmentAnalytics.length > 0 ? <div className="table-scroll" role="region" aria-label="Department workload report" tabIndex="0">
            <table>
              <caption className="visually-hidden">Complaint count by department and status</caption>
              <thead><tr><th scope="col">{uiCopy.deptColDepartment}</th><th scope="col">{uiCopy.deptColTotal}</th><th scope="col">{uiCopy.deptColSubmitted}</th><th scope="col">{uiCopy.deptColInProgress}</th><th scope="col">{uiCopy.deptColReopen}</th><th scope="col">{uiCopy.deptColResolved}</th></tr></thead>
              <tbody>{departmentAnalytics.map((row) => <tr key={row.department}>
                <th scope="row">{formatDepartment(row.department)}</th><td>{row.total}</td><td>{row.submitted}</td>
                <td>{row.inProgress}</td><td>{row.reopenRequested}</td><td>{row.resolved}</td>
              </tr>)}</tbody>
            </table>
          </div> : !analyticsMessage && <p role="status">{uiCopy.loadingAnalytics}</p>}
        </section>}

        {activeNavTab === "map" && (
          <WardMapView
            complaints={complaints}
            uiCopy={uiCopy}
            formatDepartment={formatDepartment}
            onSelectComplaint={(c) => {
              if (c.complaintNumber) {
                setFilters((f) => ({ ...f, search: c.complaintNumber }));
                fetchComplaints({ page: 0, activeFilters: { ...filters, search: c.complaintNumber } });
              }
              setActiveNavTab("dashboard");
            }}
          />
        )}

        {activeNavTab !== "map" && (
          <div className={`dashboard-content ${currentUser.role !== "CITIZEN" ? "admin-grid" : ""}`}>
          {currentUser.role === "CITIZEN" && activeNavTab === "lodge" && (
            <div className="lodge-view-wrapper">
              <section className="card complaint-form-card" id="complaint-form-card" lang={intakeLanguage} aria-labelledby="form-heading">
            {/* Wizard Step Tabs */}
            <div className="card-header" style={{ paddingBottom: 0, borderBottom: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <p className="section-label">{intakeCopy.section}</p>
                  <h2 id="form-heading">{intakeCopy.heading}</h2>
                  <p className="draft-storage-note" aria-live="polite">
                    {intakeCopy.draftNote}
                    {draftNotice && <><br />{draftNotice}</>}
                  </p>
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
                  <label htmlFor="intake-language">{intakeCopy.language}</label>
                  <select id="intake-language" value={intakeLanguage} onChange={(e) => setIntakeLanguage(e.target.value)}>
                    {INTAKE_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Step tabs */}
            <nav className="wizard-steps" aria-label="Form steps">
              {[
                { n: 1, label: intakeCopy.category + " & " + intakeCopy.title },
                { n: 2, label: intakeCopy.location + " & " + intakeCopy.photo },
                { n: 3, label: intakeCopy.submit },
              ].map(({ n, label }) => (
                <div
                  key={n}
                  className={`wizard-step-tab ${wizardStep === n ? "active" : wizardStep > n ? "done" : ""}`}
                  aria-current={wizardStep === n ? "step" : undefined}
                >
                  <span className="wizard-step-num">{wizardStep > n ? "✓" : n}</span>
                  {label}
                </div>
              ))}
            </nav>

            <form id="complaint-form" lang={intakeLanguage} onSubmit={handleSubmit}>
              {/* ── Step 1: Category & Details ────────────────── */}
              {wizardStep === 1 && (
                <div className="wizard-panel" role="group" aria-labelledby="step1-heading">
                  <h3 id="step1-heading" className="visually-hidden">{intakeCopy.category} &amp; {intakeCopy.title}</h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="category">{intakeCopy.category}</label>
                      <select id="category" name="category" value={formData.category} onChange={handleChange}>
                        {Object.entries(intakeCopy.categories).map(([v, l]) => <option value={v} key={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="priority">{intakeCopy.priority}</label>
                      <select id="priority" name="priority" value={formData.priority} onChange={handleChange}>
                        {Object.entries(intakeCopy.priorities).map(([v, l]) => <option value={v} key={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="title">{intakeCopy.title}</label>
                    <input
                      id="title" name="title" type="text" required maxLength="150"
                      placeholder={intakeCopy.titlePlaceholder}
                      value={formData.title} onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">{intakeCopy.description}</label>
                    <textarea
                      id="description" name="description" rows="5" required maxLength="2000"
                      placeholder={intakeCopy.descriptionPlaceholder}
                      value={formData.description} onChange={handleChange}
                    />
                  </div>

                  {/* AI Classification Assistant */}
                  <div className="form-group classification-assistant-group">
                    <button type="button" className="classification-button" onClick={handleRequestClassification} disabled={classifying}>
                      {classifying ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }}></span> {uiCopy.analyzing}</> : `✨ ${uiCopy.suggestAdvisory}`}
                    </button>
                    {classificationSuggestion && (
                      <div className="advisory-card" role="status">
                        <div className="advisory-header">
                          <strong>{uiCopy.advisorySuggestion}</strong>
                          <span className="confidence-pill">{uiCopy.confidence}: {Math.round((classificationSuggestion.confidence || 0) * 100)}%</span>
                        </div>
                        <p className="advisory-text">
                          {formatCategory(classificationSuggestion.category)} · {classificationSuggestion.priority}
                          {classificationSuggestion.explanation && ` — ${classificationSuggestion.explanation}`}
                        </p>
                        <button type="button" className="submit-button apply-advisory-btn" onClick={applyClassificationSuggestion}>
                          {uiCopy.applySuggestion}
                        </button>
                      </div>
                    )}
                    {classificationNote && <small className="advisory-note" role="status">{classificationNote}</small>}
                  </div>
                </div>
              )}

              {/* ── Step 2: Location & Evidence ──────────────── */}
              {wizardStep === 2 && (
                <div className="wizard-panel" role="group" aria-labelledby="step2-heading">
                  <h3 id="step2-heading" className="visually-hidden">{intakeCopy.location} &amp; {intakeCopy.photo}</h3>

                  <div className="form-group">
                    <label htmlFor="location">
                      {intakeCopy.location}
                      <span className="optional-label">(Street, Ward, Landmark or Area in Thane)</span>
                    </label>
                    <div className="location-input-wrapper">
                      <div className="location-input-box">
                        <input
                          id="location"
                          name="location"
                          type="text"
                          required
                          maxLength="255"
                          autoComplete="off"
                          placeholder="Type address, ward, or landmark (e.g., Naupada, Wagle Estate, Viviana Mall)"
                          value={formData.location}
                          onChange={handleLocationInputChange}
                          onFocus={() => {
                            if (locationSuggestions.length > 0) setShowLocationDropdown(true);
                          }}
                        />
                        {formData.location && (
                          <button
                            type="button"
                            className="location-clear-btn"
                            title="Clear location"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, location: "", latitude: "", longitude: "" }));
                              setLocationSuggestions([]);
                              setShowLocationDropdown(false);
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Dropdown of location suggestions */}
                      {showLocationDropdown && locationSuggestions.length > 0 && (
                        <ul className="location-autocomplete-dropdown" role="listbox">
                          {locationSuggestions.map((loc, idx) => (
                            <li
                              key={`${loc.name}-${idx}`}
                              className="autocomplete-option"
                              role="option"
                              tabIndex="0"
                              onClick={() => handleSelectLocationSuggestion(loc)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSelectLocationSuggestion(loc);
                              }}
                            >
                              <span className="autocomplete-icon">📍</span>
                              <div className="autocomplete-content">
                                <span className="autocomplete-title">{loc.name}</span>
                                <span className="autocomplete-sub">{loc.area}</span>
                              </div>
                              <span className="autocomplete-badge">{loc.landmark || "TMC Ward"}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <button className="location-button" type="button" onClick={useCurrentLocation}>
                        📍 {intakeCopy.useLocation}
                      </button>
                      {locationSearching && (
                        <small style={{ color: "var(--navy-600)", fontWeight: 600 }}>🔍 Searching map database…</small>
                      )}
                      {formData.latitude && formData.longitude && (
                        <span className="map-coords-pill">
                          ✅ GPS: {Number(formData.latitude).toFixed(4)}° N, {Number(formData.longitude).toFixed(4)}° E
                        </span>
                      )}
                    </div>

                    {/* Interactive Municipal Map Preview */}
                    <div className={`map-preview-card ${formData.latitude && formData.longitude ? "has-pin" : ""}`}>
                      <div className="map-preview-header">
                        <div className="map-pin-status">
                          <span>🗺️</span>
                          <strong>
                            {formData.latitude && formData.longitude
                              ? `Location Pinned: ${formData.location || "Selected Area"}`
                              : "Thane Municipal Map & Ward Selector"}
                          </strong>
                        </div>
                        {formData.latitude && formData.longitude && (
                          <a
                            className="map-osm-link"
                            href={`https://www.openstreetmap.org/?mlat=${formData.latitude}&mlon=${formData.longitude}#map=16/${formData.latitude}/${formData.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Full Map ↗
                          </a>
                        )}
                      </div>

                      {formData.latitude && formData.longitude ? (
                        <div className="map-iframe-wrapper">
                          <iframe
                            title="OpenStreetMap Location Preview"
                            className="map-iframe"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(formData.longitude) - 0.007}%2C${Number(formData.latitude) - 0.005}%2C${Number(formData.longitude) + 0.007}%2C${Number(formData.latitude) + 0.005}&layer=mapnik&marker=${formData.latitude}%2C${formData.longitude}`}
                          />
                        </div>
                      ) : (
                        <div className="map-quick-picker">
                          <p>Quick Pin: Select an official Thane Municipal Ward:</p>
                          <div className="map-quick-chips">
                            {THANE_LOCALITIES.slice(0, 10).map((loc) => (
                              <button
                                key={loc.name}
                                type="button"
                                className="map-chip-btn"
                                onClick={() => handleSelectLocationSuggestion(loc)}
                              >
                                + {loc.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drag-and-drop photo zone */}
                  <div className="form-group">
                    <label>{intakeCopy.photo} <span className="optional-label">{intakeCopy.optional}</span></label>
                    <div
                      className={`photo-upload-zone${dragOver ? " drag-over" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const fakeEvent = { target: { files: [file] } };
                          handleImageSelect(fakeEvent);
                        }
                      }}
                    >
                      <input
                        id="evidence-image"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleImageSelect}
                        aria-label={intakeCopy.photo}
                      />
                      <div className="photo-upload-icon">📸</div>
                      <p>{dragOver ? "Drop photo here…" : "Drag & drop or click to upload"}</p>
                      <small>{intakeCopy.photoRules}</small>
                    </div>
                    {imageFile && (
                      <div className="photo-preview">
                        <span>✅ {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 3: Review & Submit ───────────────────── */}
              {wizardStep === 3 && (
                <div className="wizard-panel" role="group" aria-labelledby="step3-heading">
                  <h3 id="step3-heading" className="visually-hidden">{intakeCopy.submit}</h3>
                  <div className="complaint-info" style={{ marginBottom: 16 }}>
                    <div className="info-item">
                      <span className="info-label">{intakeCopy.title}</span>
                      <span>{formData.title || "—"}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{intakeCopy.category}</span>
                      <span>{formatCategory(formData.category)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{intakeCopy.priority}</span>
                      <span>{formatPriority(formData.priority)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{intakeCopy.location}</span>
                      <span>{formData.location || "—"}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{intakeCopy.photo}</span>
                      <span>{imageFile ? imageFile.name : intakeCopy.optional}</span>
                    </div>
                    {formData.latitude && formData.longitude && (
                      <div className="info-item">
                        <span className="info-label">GPS</span>
                        <span>{formData.latitude.slice(0, 7)}, {formData.longitude.slice(0, 7)}</span>
                      </div>
                    )}
                  </div>
                  <p className="card-description" style={{ marginBottom: 0 }}>{intakeCopy.intro}</p>

                  {duplicateReviewSignature === complaintSubmissionSignature() && (
                    <div className="duplicate-review" role="alert">
                      <h3>{uiCopy.duplicateTitle}</h3>
                      <p>{uiCopy.duplicateDesc}</p>
                      <div className="duplicate-review-actions">
                        <button type="button" className="secondary-button" onClick={() => setDuplicateReviewSignature(null)}>{uiCopy.reviewMyComplaints}</button>
                        <button type="button" className="submit-button" onClick={() => {
                          duplicateProceedKeyRef.current = submissionKeyRef.current?.key;
                          document.getElementById("complaint-form")?.requestSubmit();
                        }}>{uiCopy.submitAnyway}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Wizard Navigation */}
              <div className="wizard-nav">
                {wizardStep > 1 && (
                  <button type="button" className="btn-wizard-back" onClick={() => setWizardStep(s => s - 1)}>
                    ← {uiCopy.previous}
                  </button>
                )}
                {wizardStep < 3 && (
                  <button
                    type="button"
                    className="btn-wizard-next"
                    style={{ marginLeft: wizardStep === 1 ? "auto" : undefined }}
                    onClick={() => {
                      if (wizardStep === 1 && (!formData.title?.trim() || !formData.description?.trim())) return;
                      if (wizardStep === 2 && !formData.location?.trim()) return;
                      setWizardStep(s => s + 1);
                    }}
                    disabled={
                      (wizardStep === 1 && (!formData.title?.trim() || !formData.description?.trim())) ||
                      (wizardStep === 2 && !formData.location?.trim())
                    }
                  >
                    {uiCopy.next} →
                  </button>
                )}
                {wizardStep === 3 && (
                  <button className="btn-wizard-next" type="submit" disabled={loading} style={{ marginLeft: "auto" }}>
                    {loading
                      ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> {intakeCopy.submitting}</>
                      : `✅ ${intakeCopy.submit}`}
                  </button>
                )}
              </div>
            </form>
          </section>
          <div className="switch-to-tracker-banner">
            <div>
              <p><strong>Want to check previously lodged grievances?</strong></p>
              <span style={{ fontSize: 12.5, color: "var(--gray-600)" }}>
                View official progress timelines, Action Taken Reports (ATRs), and municipal resolution proofs.
              </span>
            </div>
            <button type="button" onClick={() => setActiveNavTab("dashboard")}>
              Open Grievance Tracker ({complaints.length}) →
            </button>
          </div>
        </div>
      )}

      {(activeNavTab === "dashboard" || currentUser.role !== "CITIZEN") && (
        <section className="card dashboard-card" id="dashboard-section">
          {currentUser.role === "CITIZEN" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--gray-100)", flexWrap: "wrap", gap: 10 }}>
              <button
                type="button"
                className="submit-button btn-accent"
                style={{ width: "auto", height: 38, padding: "0 18px", fontSize: 13.5 }}
                onClick={() => setActiveNavTab("lodge")}
              >
                ➕ {intakeCopy.submit || "Lodge a New Grievance"}
              </button>
              <span style={{ fontSize: 12.5, color: "var(--gray-500)" }}>
                Official municipal grievances registered under your Citizen Account
              </span>
            </div>
          )}
            <div className="card-header dashboard-header">
              <div>
                <p className="section-label">{uiCopy.complaintsSection}</p>
                <h2>{uiCopy.dashboardHeading}</h2>
                <p className="card-description" role="status" aria-live="polite" aria-atomic="true">
                  {pageInfo.totalElements} {pageInfo.totalElements !== 1 ? uiCopy.complaintPlural : uiCopy.complaintSingular} {hasActiveFilters ? uiCopy.matchFilters : uiCopy.inQueue}
                </p>
              </div>

              <div className="dashboard-actions">
                {currentUser.role === "ADMIN" && <button className="refresh-button" type="button"
                  onClick={exportComplaints} disabled={exportPending}>{exportPending ? uiCopy.preparingExport : uiCopy.exportCsv}</button>}
                <button className="refresh-button" type="button" onClick={fetchComplaints} disabled={loading}>
                  {loading ? uiCopy.loading : uiCopy.refresh}
                </button>
              </div>
            </div>

            <div className="filters" role="group" aria-label="Filter complaints">
              <input
                aria-label="Search complaints"
                placeholder={uiCopy.searchPlaceholder}
                maxLength="150"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
              />
              <select aria-label="Filter by status" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                <option value="ALL">{uiCopy.allStatuses}</option>
                <option value="SUBMITTED">{uiCopy.statusSubmitted}</option>
                <option value="IN_PROGRESS">{uiCopy.statusInProgress}</option>
                <option value="REOPEN_REQUESTED">{uiCopy.statusReopenRequested}</option>
                <option value="RESOLVED">{uiCopy.statusResolved}</option>
              </select>
              <select aria-label="Filter by category" value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
                <option value="ALL">{uiCopy.allCategories}</option>
                {["ROAD", "GARBAGE", "WATER", "ELECTRICITY", "STREET_LIGHT", "DRAINAGE", "OTHER"].map((category) => <option key={category} value={category}>{formatCategory(category)}</option>)}
              </select>
              <select aria-label="Filter by priority" value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)}>
                <option value="ALL">{uiCopy.allPriorities}</option>
                <option value="HIGH">{uiCopy.priorityHigh}</option>
                <option value="MEDIUM">{uiCopy.priorityMedium}</option>
                <option value="LOW">{uiCopy.priorityLow}</option>
              </select>
              <select aria-label="Sort complaints" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
                <option value="NEWEST">{uiCopy.newestFirst}</option>
                <option value="OLDEST">{uiCopy.oldestFirst}</option>
                <option value="TITLE">{uiCopy.titleAZ}</option>
                <option value="PRIORITY">{uiCopy.priorityAZ}</option>
              </select>
            </div>

            {loading && complaints.length === 0 ? (
              <div className="empty-state">
                <h3>{uiCopy.loadingComplaints}</h3>
                <p>{uiCopy.loadingDesc}</p>
              </div>
            ) : visibleComplaints.length === 0 ? (
              <div className="empty-state">
                <h3>{hasActiveFilters ? uiCopy.noMatching : uiCopy.noComplaintsFound}</h3>
                <p>{hasActiveFilters ? uiCopy.clearFiltersHint : uiCopy.submittedAppear}</p>
              </div>
            ) : (
              <div className="complaints-list" aria-busy={loading}>
                {visibleComplaints.map((complaint) => (
                  <article className="complaint" key={complaint.id}>
                    <div className="complaint-top">
                      <div className="complaint-heading">
                        <span className="complaint-number">
                          {complaint.complaintNumber}
                        </span>

                        <h3>{complaint.title}</h3>
                      </div>

                      <div className="badge-group" style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <span className={getStatusClass(complaint.status)}>
                          {formatStatus(complaint.status)}
                        </span>
                        <span className={getPriorityClass(complaint.priority)}>
                          {formatPriority(complaint.priority)}
                        </span>
                        {complaint.overdue && <span className="sla-overdue" role="status">{uiCopy.overdueBadge}</span>}
                      </div>
                    </div>

                    {/* Task-First Status Timeline */}
                    <div className="status-timeline" aria-label="Grievance Progress Timeline">
                      <div className="timeline-steps">
                        <div className="timeline-step done">
                          <div className="timeline-dot">✓</div>
                          <div className="timeline-label">{uiCopy.stepLodged}</div>
                          <div className="timeline-date">{new Date(complaint.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className={`timeline-step ${complaint.assignedStaffId || ["IN_PROGRESS", "RESOLVED"].includes(complaint.status) ? "done" : "active"}`}>
                          <div className="timeline-dot">{complaint.assignedStaffId || ["IN_PROGRESS", "RESOLVED"].includes(complaint.status) ? "✓" : "2"}</div>
                          <div className="timeline-label">{uiCopy.stepDeptAssigned}</div>
                          <div className="timeline-date">{formatDepartment(complaint.department)}</div>
                        </div>
                        <div className={`timeline-step ${complaint.status === "RESOLVED" ? "done" : complaint.status === "IN_PROGRESS" ? "active" : ""}`}>
                          <div className="timeline-dot">{complaint.status === "RESOLVED" ? "✓" : "3"}</div>
                          <div className="timeline-label">{uiCopy.stepInspection}</div>
                        </div>
                        <div className={`timeline-step ${complaint.status === "RESOLVED" ? "done" : ""}`}>
                          <div className="timeline-dot">{complaint.status === "RESOLVED" ? "✓" : "4"}</div>
                          <div className="timeline-label">{uiCopy.stepResolved}</div>
                        </div>
                      </div>
                    </div>

                    <p className="description">{complaint.description}</p>

                    <div className="complaint-info">
                      {complaint.slaDueAt && <div className="info-item">
                        <span className="info-label">{uiCopy.serviceTarget}</span>
                        <span>{new Date(complaint.slaDueAt).toLocaleString()}</span>
                      </div>}
                      <div className="info-item">
                        <span className="info-label">{uiCopy.categoryDepartment}</span>
                        <span>{formatCategory(complaint.category)} · {formatDepartment(complaint.department)}</span>
                      </div>

                      <div className="info-item">
                        <span className="info-label">{uiCopy.locationLabel}</span>
                        <span>{complaint.location}</span>
                        {complaint.latitude != null && complaint.longitude != null && <a aria-label={`View map for ${complaint.complaintNumber}`} href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=17/${complaint.latitude}/${complaint.longitude}`} target="_blank" rel="noreferrer">{uiCopy.viewMap}</a>}
                      </div>
                    </div>

                    {complaint.imageUrl && <img className="complaint-image" src={`${API_ROOT}${complaint.imageUrl}`} alt={`Photo evidence for ${complaint.title}`} loading="lazy" />}

                    {/* OFFICIAL GOVERNMENT ACTION TAKEN REPORT (ATR) FOR RESOLVED COMPLAINTS */}
                    {complaint.status === "RESOLVED" && (
                      <div className="gov-atr-panel">
                        <div className="gov-atr-header">
                          <div className="gov-atr-title">
                            <span className="gov-emblem">🏛️</span>
                            <div>
                              <strong>{uiCopy.atrHeader}</strong>
                              <span className="gov-atr-meta">{uiCopy.atrMeta}{complaint.complaintNumber}</span>
                            </div>
                          </div>
                          <span className="gov-resolved-tag">{uiCopy.atrResolvedTag}</span>
                        </div>

                        <div className="gov-atr-content">
                          {complaint.resolutionImageUrl && (
                            <div className="gov-atr-image-container">
                              <span className="gov-photo-badge">{uiCopy.atrProofLabel}</span>
                              <img className="gov-atr-img" src={`${API_ROOT}${complaint.resolutionImageUrl}`} alt={`Resolution proof for ${complaint.complaintNumber}`} />
                            </div>
                          )}

                          <div className="gov-atr-text">
                            <span className="gov-label">{uiCopy.atrRemarksLabel}</span>
                            <blockquote className="gov-quote">
                              {historyByComplaint[complaint.id]?.find((h) => h.newStatus === "RESOLVED")?.reason || uiCopy.atrDefaultRemarks}
                            </blockquote>
                          </div>
                        </div>

                        {currentUser.role === "CITIZEN" && (
                          <div className="gov-citizen-satisfaction">
                            {complaint.citizenRating != null ? (
                              <div className="gov-feedback-confirmed">
                                <span className="gov-star-badge">⭐ {complaint.citizenRating}/5</span>
                                <div>
                                  <strong>{uiCopy.feedbackRecorded}</strong>
                                  {complaint.citizenFeedback && <p>"{complaint.citizenFeedback}"</p>}
                                  {complaint.feedbackAt && <small>{new Date(complaint.feedbackAt).toLocaleDateString()}</small>}
                                </div>
                              </div>
                            ) : (
                              <div className="gov-feedback-interactive">
                                <h4>{uiCopy.howWasResolution}</h4>
                                <p className="gov-feedback-hint">{uiCopy.satisfactionHint}</p>
                                <div className="gov-feedback-actions">
                                  <button type="button" className="gov-btn-satisfied" onClick={() => setCitizenFollowupViews((p) => ({ ...p, [complaint.id]: "rate" }))}>
                                    {uiCopy.satisfiedBtn}
                                  </button>
                                  <button type="button" className="gov-btn-unsatisfied" onClick={() => setCitizenFollowupViews((p) => ({ ...p, [complaint.id]: "appeal" }))}>
                                    {uiCopy.unsatisfiedBtn}
                                  </button>
                                </div>

                                {citizenFollowupViews[complaint.id] === "rate" && (
                                  <form className="gov-subform" onSubmit={(event) => { event.preventDefault(); submitFeedback(complaint.id); }}>
                                    <div className="form-group">
                                      <label htmlFor={`feedback-rating-${complaint.id}`}>{uiCopy.feedbackRatingLabel}</label>
                                      <select id={`feedback-rating-${complaint.id}`} value={feedbackDrafts[complaint.id]?.rating || 5}
                                        onChange={(event) => setFeedbackDrafts((previous) => ({ ...previous, [complaint.id]: { ...(previous[complaint.id] || {}), rating: Number(event.target.value) } }))}>
                                        {(RATING_OPTIONS[intakeLanguage] || RATING_OPTIONS.en).map((opt) => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="form-group">
                                      <label htmlFor={`feedback-comment-${complaint.id}`}>{uiCopy.feedbackCommentLabel}</label>
                                      <textarea id={`feedback-comment-${complaint.id}`} maxLength="1000" value={feedbackDrafts[complaint.id]?.feedback || ""}
                                        onChange={(event) => setFeedbackDrafts((previous) => ({ ...previous, [complaint.id]: { ...(previous[complaint.id] || { rating: 5 }), feedback: event.target.value } }))}
                                        placeholder={uiCopy.feedbackCommentPlaceholder} />
                                    </div>
                                    <button className="submit-button" type="submit" disabled={complaintActionPending !== ""}>{uiCopy.confirmSubmitFeedback}</button>
                                  </form>
                                )}

                                {citizenFollowupViews[complaint.id] === "appeal" && (
                                  <form className="gov-subform gov-subform-appeal" onSubmit={(event) => { event.preventDefault(); submitReopenRequest(complaint.id); }}>
                                    <div className="form-group">
                                      <label htmlFor={`appeal-reason-${complaint.id}`}>{uiCopy.appealLabel}</label>
                                      <textarea id={`appeal-reason-${complaint.id}`} required maxLength="1000" value={reopenReasonDrafts[complaint.id] || ""}
                                        onChange={(event) => setReopenReasonDrafts((previous) => ({ ...previous, [complaint.id]: event.target.value }))}
                                        placeholder={uiCopy.appealPlaceholder} />
                                    </div>
                                    <button className="submit-button btn-danger" type="submit" disabled={complaintActionPending !== ""}>{uiCopy.submitAppeal}</button>
                                  </form>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* MUNICIPAL OFFICER ACTION DESK FOR ACTIVE COMPLAINTS */}
                    {currentUser.role !== "CITIZEN" && complaint.status !== "RESOLVED" && (
                      <div className="gov-officer-action-desk">
                        <div className="gov-desk-header">
                          <span className="gov-badge-officer">{uiCopy.officerDeskTitle}</span>
                          <span className="gov-desk-target">{formatDepartment(complaint.department)} {uiCopy.officerDeskDept}</span>
                        </div>

                        {complaint.status === "SUBMITTED" && (
                          <div className="gov-desk-row">
                            <p className="gov-desk-hint">{uiCopy.initiateActionHint}</p>
                            <button type="button" className="gov-btn-progress" onClick={() => updateStatus(complaint.id, "IN_PROGRESS")} disabled={complaintActionPending !== ""}>
                              {uiCopy.initiateActionBtn}
                            </button>
                          </div>
                        )}

                        {complaint.status === "REOPEN_REQUESTED" && (
                          <div className="gov-reopen-review-panel">
                            <div className="gov-alert-banner">{uiCopy.citizenReopenAlert}</div>
                            <div className="form-group">
                              <label htmlFor={`status-reason-${complaint.id}`}>{uiCopy.officerDecisionLabel}</label>
                              <textarea id={`status-reason-${complaint.id}`} maxLength="1000" required value={statusReasonDrafts[complaint.id] || ""}
                                onChange={(event) => setStatusReasonDrafts((previous) => ({ ...previous, [complaint.id]: event.target.value }))}
                                placeholder={uiCopy.officerDecisionPlaceholder} />
                            </div>
                            <div className="gov-reopen-actions">
                              <button type="button" className="gov-btn-progress" onClick={() => updateStatus(complaint.id, "IN_PROGRESS")} disabled={complaintActionPending !== ""}>
                                {uiCopy.approveReworkBtn}
                              </button>
                              <button type="button" className="gov-btn-resolved" onClick={() => updateStatus(complaint.id, "RESOLVED")} disabled={complaintActionPending !== ""}>
                                {uiCopy.confirmResolutionBtn}
                              </button>
                            </div>
                          </div>
                        )}

                        {(complaint.status === "SUBMITTED" || complaint.status === "IN_PROGRESS") && (
                          <div className="gov-atr-submission-box">
                            <h4>{uiCopy.atrBoxTitle}</h4>
                            <p className="gov-atr-guide">{uiCopy.atrBoxGuide}</p>

                            {/* Quick Resolution Action Presets */}
                            <div className="gov-presets-container">
                              <span className="gov-presets-label">{uiCopy.quickPresetsLabel}</span>
                              <div className="gov-presets-buttons">
                                {((RESOLUTION_PRESETS[intakeLanguage] || RESOLUTION_PRESETS.en)[complaint.category] || (RESOLUTION_PRESETS[intakeLanguage] || RESOLUTION_PRESETS.en).OTHER).map((preset, idx) => (
                                  <button key={idx} type="button" className="gov-preset-chip"
                                    onClick={() => setStatusReasonDrafts((previous) => ({ ...previous, [complaint.id]: preset }))}>
                                    + {preset.length > 50 ? preset.slice(0, 47) + "…" : preset}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="form-group">
                              <label htmlFor={`status-reason-${complaint.id}`}>{uiCopy.atrRemarksFieldLabel} <span className="required-star">*</span></label>
                              <textarea id={`status-reason-${complaint.id}`} maxLength="1000" rows="3" required
                                value={statusReasonDrafts[complaint.id] || ""}
                                onChange={(event) => setStatusReasonDrafts((previous) => ({ ...previous, [complaint.id]: event.target.value }))}
                                placeholder={uiCopy.atrRemarksPlaceholder} />
                            </div>

                            <div className="form-group gov-photo-group">
                              <label htmlFor={`resolution-evidence-${complaint.id}`}>
                                {uiCopy.sitePhotoLabel} <span className="optional-tag">{uiCopy.sitePhotoOptional}</span>
                              </label>
                              <input id={`resolution-evidence-${complaint.id}`} type="file" accept="image/jpeg,image/png"
                                onChange={(event) => setResolutionEvidenceFiles((previous) => ({ ...previous,
                                  [complaint.id]: event.target.files?.[0] || null }))} />
                              {resolutionEvidenceFiles[complaint.id] && (
                                <div className="gov-file-selected-badge">
                                  📎 {uiCopy.selectedFile} <strong>{resolutionEvidenceFiles[complaint.id].name}</strong> ({(resolutionEvidenceFiles[complaint.id].size / 1024).toFixed(1)} KB)
                                </div>
                              )}
                            </div>

                            <div className="gov-atr-submit-row">
                              <button type="button" className="gov-btn-submit-atr"
                                onClick={() => resolveWithATR(complaint.id)}
                                disabled={complaintActionPending !== ""}>
                                {complaintActionPending === `${complaint.id}-resolve-atr` ? uiCopy.submittingAtr : uiCopy.submitAtrBtn}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {currentUser.role === "ADMIN" && (complaint.status === "SUBMITTED" || complaint.status === "IN_PROGRESS" || complaint.status === "REOPEN_REQUESTED") &&
                      <div className="assignment-panel">
                        <label htmlFor={`assignment-staff-${complaint.id}`}>{uiCopy.assignStaff}</label>
                        <select id={`assignment-staff-${complaint.id}`}
                          value={assignmentDrafts[complaint.id]?.staffId ?? complaint.assignedStaffId ?? ""}
                          onChange={(event) => setAssignmentDrafts((previous) => ({ ...previous,
                            [complaint.id]: { ...(previous[complaint.id] || {}), staffId: event.target.value } }))}>
                          <option value="">{uiCopy.unassignedDept}</option>
                          {staffAccounts.filter((staff) => staff.active && staff.department === complaint.department)
                            .map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                        </select>
                        <label htmlFor={`assignment-reason-${complaint.id}`}>{uiCopy.assignmentReason}</label>
                        <textarea id={`assignment-reason-${complaint.id}`} maxLength="300" required
                          value={assignmentDrafts[complaint.id]?.reason || ""}
                          onChange={(event) => setAssignmentDrafts((previous) => ({ ...previous,
                            [complaint.id]: { ...(previous[complaint.id] || {}), reason: event.target.value } }))}
                          placeholder={uiCopy.assignmentPlaceholder} />
                        <button type="button" onClick={() => updateComplaintAssignment(complaint.id)}
                          disabled={complaintActionPending !== ""}>{uiCopy.saveAssignment}</button>
                      </div>}

                    <div className="complaint-bottom">
                      <span className={getStatusClass(complaint.status)}>
                        {formatStatus(complaint.status)}
                      </span>

                      <div className="status-buttons">
                        <button className="history-toggle" type="button" aria-expanded={expandedHistoryId === complaint.id}
                          onClick={() => toggleHistory(complaint.id)}>
                          {expandedHistoryId === complaint.id ? uiCopy.hideOfficialHistory : uiCopy.viewOfficialHistory}
                        </button>
                        {currentUser.role !== "CITIZEN" && (
                          <button className="history-toggle internal-notes-toggle" type="button"
                            aria-expanded={expandedInternalNotesId === complaint.id} onClick={() => toggleInternalNotes(complaint.id)}>
                            {expandedInternalNotesId === complaint.id ? uiCopy.hideInternalNotes : uiCopy.internalStaffNotes}
                          </button>
                        )}
                      </div>
                    </div>

                    {expandedHistoryId === complaint.id && <section className="history-panel" aria-label={`Update history for ${complaint.complaintNumber}`}>
                      {historyLoadingId === complaint.id ? <p>{uiCopy.loadingUpdates}</p> : historyByComplaint[complaint.id]?.length ?
                        <ol className="complaint-timeline">
                          {historyByComplaint[complaint.id].map((event) => <li key={event.id} className="timeline-step complete">
                            <span className="timeline-dot" aria-hidden="true" />
                            <span className="history-event">
                              <strong>{event.previousStatus ? `${formatStatus(event.previousStatus)} → ` : ""}{formatStatus(event.newStatus)}</strong>
                              <span>{new Date(event.changedAt).toLocaleString()} · {event.actor}</span>
                              {event.reason && <span>{event.reason}</span>}
                            </span>
                          </li>)}
                        </ol> : <p>{uiCopy.noUpdates}</p>}
                    </section>}

                    {currentUser.role !== "CITIZEN" && expandedInternalNotesId === complaint.id && (
                      <section className="history-panel internal-notes-panel" aria-label={`Internal staff notes for ${complaint.complaintNumber}`}>
                        {internalNotesLoadingId === complaint.id ? <p>{uiCopy.loadingNotes}</p> :
                          internalNotesByComplaint[complaint.id]?.length ? <ol className="internal-note-list">
                            {internalNotesByComplaint[complaint.id].map((note) => <li key={note.id}>
                              <p>{note.body}</p><small>{note.author} · {new Date(note.createdAt).toLocaleString()}</small>
                            </li>)}
                          </ol> : <p>{uiCopy.noNotes}</p>}
                        <form onSubmit={(event) => addInternalNote(event, complaint.id)}>
                          <label htmlFor={`internal-note-${complaint.id}`}>{uiCopy.addInternalNote}</label>
                          <textarea id={`internal-note-${complaint.id}`} maxLength="2000" required
                            value={internalNoteDrafts[complaint.id] || ""}
                            onChange={(event) => setInternalNoteDrafts((previous) => ({ ...previous, [complaint.id]: event.target.value }))}
                            placeholder={uiCopy.noteOnlyStaff} />
                          <button type="submit" disabled={complaintActionPending !== ""}>{uiCopy.saveInternalNote}</button>
                        </form>
                      </section>
                    )}

                    {currentUser.role === "CITIZEN" && complaint.status === "REOPEN_REQUESTED" &&
                      <p className="follow-up-message" role="status">{uiCopy.reopenAwaitingReview}</p>}
                  </article>
                ))}
              </div>
            )}

            {/* Official Municipal Citizen Helpline & Rights Assistance Banner */}
            <section className="gov-citizen-helpdesk-banner" aria-label="Municipal Assistance & Citizen Charter">
              <div className="gov-helpdesk-col">
                <span className="gov-helpdesk-icon">📞</span>
                <div>
                  <strong>{uiCopy.helpdeskTitle}</strong>
                  <span>{uiCopy.helpdeskNumber}</span>
                </div>
              </div>
              <div className="gov-helpdesk-col">
                <span className="gov-helpdesk-icon">💬</span>
                <div>
                  <strong>{uiCopy.whatsappTitle}</strong>
                  <span>{uiCopy.whatsappNumber}</span>
                </div>
              </div>
              <div className="gov-helpdesk-col">
                <span className="gov-helpdesk-icon">📜</span>
                <div>
                  <strong>{uiCopy.rtsTitle}</strong>
                  <span>{uiCopy.rtsSub}</span>
                </div>
              </div>
            </section>
            {pageInfo.totalPages > 1 && <nav className="pagination" aria-label="Complaint pages">
              <button onClick={() => changePage(currentPage - 1)} disabled={currentPage === 0 || loading}>{uiCopy.previous}</button>
              <span role="status" aria-live="polite" aria-atomic="true">{uiCopy.pageIndicator.replace("{current}", currentPage + 1).replace("{total}", pageInfo.totalPages)}</span>
              <button onClick={() => changePage(currentPage + 1)} disabled={currentPage + 1 >= pageInfo.totalPages || loading}>{uiCopy.next}</button>
            </nav>}
          </section>
        )}
        </div>
        )}
        </div>
        </div>
      </main>

      {/* Public Complaint Tracker Modal */}
      {publicTrackerOpen && publicTrackId && (
        <PublicTrackerModal
          complaintNumber={publicTrackId}
          apiRoot={API_ROOT}
          uiCopy={uiCopy}
          onClose={() => setPublicTrackerOpen(false)}
        />
      )}

      {/* Production Municipal Citizen & Officer Profile Modal */}
      {profileModalOpen && (
        <div className="profile-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setProfileModalOpen(false); }}>
          <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
            <div className="profile-modal-header">
              <div className="profile-modal-title">
                <span style={{ fontSize: 24 }}>🏛️</span>
                <div>
                  <h2 id="profile-dialog-title">
                    {currentUser.role === "CITIZEN"
                      ? (uiCopy.profileModalTitleCitizen || "Citizen Digital Identity & Services")
                      : (uiCopy.profileModalTitleOfficer || "TMC Municipal Personnel Profile")}
                  </h2>
                  <p>{uiCopy.profileModalSubtitle || "Thane Municipal Corporation · CivicConnect Portal"}</p>
                </div>
              </div>
              <button type="button" className="profile-close-btn" onClick={() => setProfileModalOpen(false)} aria-label="Close profile">
                ✕
              </button>
            </div>

            <div className="profile-modal-body">
              {/* Identity Banner */}
              <div className="profile-id-banner">
                <div className="profile-avatar-large">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="profile-id-details">
                  <span className="profile-id-number">
                    {currentUser.role === "CITIZEN"
                      ? `${uiCopy.profileCitizenIdLabel || "CITIZEN ID:"} #TMC-CIT-${String(currentUser.id || 1).padStart(5, '0')}`
                      : `${uiCopy.profileOfficerIdLabel || "OFFICER ID:"} #TMC-EMP-${String(currentUser.id || 1).padStart(5, '0')}`}
                  </span>
                  <div className="profile-name-heading">{currentUser.name}</div>
                  <div className="profile-email-verified">
                    <span>✔ {currentUser.email}</span>
                    <span style={{ color: "var(--gray-400)" }}>·</span>
                    <span style={{ color: "var(--navy-600)" }}>
                      {currentUser.role === "ADMIN"
                        ? uiCopy.administrator
                        : isDepartmentEmployee(currentUser.role)
                        ? `${formatRoleLocalized(currentUser.role)} (${formatDepartment(currentUser.department)})`
                        : (uiCopy.profileVerifiedResident || "Verified Resident")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="profile-section-title">{uiCopy.profileSectionTrackRecord || "Grievance & Service Track Record"}</div>
              <div className="profile-stats-grid">
                <div className="profile-stat-box">
                  <div className="profile-stat-number">{currentUser.role === "CITIZEN" ? complaints.length : totalComplaints}</div>
                  <div className="profile-stat-label">{uiCopy.profileStatTotalGrievances || "Total Grievances"}</div>
                </div>
                <div className="profile-stat-box">
                  <div className="profile-stat-number" style={{ color: "var(--warning-text)" }}>{inProgressComplaints}</div>
                  <div className="profile-stat-label">{uiCopy.profileStatUnderAction || "Under Action"}</div>
                </div>
                <div className="profile-stat-box">
                  <div className="profile-stat-number" style={{ color: "var(--success-text)" }}>{resolvedComplaints}</div>
                  <div className="profile-stat-label">{uiCopy.profileStatResolved || "Resolved (ATR)"}</div>
                </div>
              </div>

              {/* Edit Name & Preferences */}
              <div className="profile-section-title">{uiCopy.profileSectionAccountWard || "Account Details & Ward Settings"}</div>
              <form onSubmit={async (e) => {
                await handleProfileSave(e);
                setProfileModalOpen(false);
              }}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label htmlFor="modal-profile-name">{uiCopy.fullName}</label>
                  <input
                    id="modal-profile-name"
                    type="text"
                    required
                    maxLength="100"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label htmlFor="profile-ward">{uiCopy.profileWardLabel || "Registered Administrative Ward"}</label>
                  <select
                    id="profile-ward"
                    value={profilePrefs.ward}
                    onChange={(e) => updateProfilePref("ward", e.target.value)}
                  >
                    {THANE_WARDS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div className="profile-section-title">{uiCopy.profileSectionNotifications || "Citizen Notification Preferences"}</div>
                <div className="profile-pref-item">
                  <div className="profile-pref-label">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{uiCopy.profilePrefSmsTitle || "SMS Grievance Status Alerts"}</strong>
                      <span className="profile-badge-muted">{uiCopy.profilePrefComingSoon || "Coming soon"}</span>
                    </div>
                    <span>{uiCopy.profilePrefSmsDesc || "Receive real-time SMS whenever grievance progress changes."}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profilePrefs.smsAlerts}
                    onChange={(e) => updateProfilePref("smsAlerts", e.target.checked)}
                  />
                </div>

                <div className="profile-pref-item">
                  <div className="profile-pref-label">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{uiCopy.profilePrefWhatsappTitle || "WhatsApp Municipal Helpdesk"}</strong>
                      <span className="profile-badge-muted">{uiCopy.profilePrefComingSoon || "Coming soon"}</span>
                    </div>
                    <span>{uiCopy.profilePrefWhatsappDesc || "Get official Action Taken Report (ATR) proofs via WhatsApp."}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profilePrefs.whatsappAlerts}
                    onChange={(e) => updateProfilePref("whatsappAlerts", e.target.checked)}
                  />
                </div>

                <div className="profile-pref-item">
                  <div className="profile-pref-label">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{uiCopy.profilePrefEmailTitle || "Email Digest & ATR Reports"}</strong>
                      <span className="profile-badge-muted">{uiCopy.profilePrefComingSoon || "Coming soon"}</span>
                    </div>
                    <span>{uiCopy.profilePrefEmailDesc || "Send official resolution confirmation PDF to registered email."}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profilePrefs.emailReports}
                    onChange={(e) => updateProfilePref("emailReports", e.target.checked)}
                  />
                </div>

                <div className="profile-section-title">{uiCopy.profileSectionSecurity || "Security & Session Status"}</div>
                <div style={{ background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "12px 14px", fontSize: 12.5, color: "var(--gray-700)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ color: "var(--success-text)", fontWeight: 700 }}>🟢 {uiCopy.profileSecurityEncrypted || "Encrypted Session"}</span>
                    <span style={{ display: "block", color: "var(--gray-500)", fontSize: 11.5, marginTop: 2 }}>{uiCopy.profileSecurityDetail || "Spring Security HttpOnly Cookie · Double-Submit CSRF Guard Active"}</span>
                  </div>
                  <span style={{ fontSize: 11, background: "var(--navy-100)", color: "var(--navy-800)", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{uiCopy.profileSecurityTls || "256-BIT TLS"}</span>
                </div>

                <div className="profile-modal-footer" style={{ marginTop: 20 }}>
                  <button type="button" className="text-button" style={{ color: "var(--error-text)" }} onClick={() => { setProfileModalOpen(false); handleLogout(); }}>
                    {uiCopy.signOut}
                  </button>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" className="text-button" onClick={() => setProfileModalOpen(false)}>
                      {uiCopy.cancel}
                    </button>
                    <button type="submit" className="submit-button" style={{ width: "auto", padding: "8px 20px" }} disabled={profileSaving}>
                      {profileSaving ? uiCopy.saving : uiCopy.saveProfile}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
