import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { LocationPicker } from "../components/LocationPicker.jsx";
import { classifyComplaint, checkDuplicates, submitComplaint, generateUuid } from "../api/complaints.js";
import { clearComplaintDraft, readComplaintDraft, writeComplaintDraft } from "../complaintDraft.js";
import { searchThaneLocations, reverseGeocodeThane } from "../locationData.js";
import { MapPin, AlertTriangle, ArrowRight, ArrowLeft, Upload, CheckCircle2, Sparkles, FileText, ShieldCheck, Navigation, Loader2 } from "lucide-react";
import { PriorityBadge } from "../components/PriorityBadge.jsx";

const CATEGORIES = [
  { value: "ROAD", label: "Roads & Potholes" },
  { value: "GARBAGE", label: "Garbage & Solid Waste" },
  { value: "WATER", label: "Water Supply & Leakage" },
  { value: "ELECTRICITY", label: "Electricity / Power Outage" },
  { value: "STREET_LIGHT", label: "Street Lighting" },
  { value: "DRAINAGE", label: "Drainage & Sewage Overflow" },
];

const CATEGORY_PRIORITY_MAP = {
  DRAINAGE: { priority: "HIGH", label: "High Priority", reason: "Public health, sanitation & flood hazard" },
  ELECTRICITY: { priority: "HIGH", label: "High Priority", reason: "Electrical safety & power outage hazard" },
  ROAD: { priority: "MEDIUM", label: "Medium Priority", reason: "Transit safety & pothole infrastructure repair" },
  WATER: { priority: "MEDIUM", label: "Medium Priority", reason: "Municipal potable water supply & pipeline leaks" },
  GARBAGE: { priority: "MEDIUM", label: "Medium Priority", reason: "Solid waste clearance & sanitation hygiene" },
  STREET_LIGHT: { priority: "LOW", label: "Low Priority", reason: "Routine street illumination & fixture repair" },
};

const getPriorityForCategory = (category) => {
  return (CATEGORY_PRIORITY_MAP[category] || CATEGORY_PRIORITY_MAP.ROAD).priority;
};

export function SubmitComplaint() {
  const { user } = useAuth();
  const { success, error: toastError, warning } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => {
    const draft = user?.email ? readComplaintDraft(user.email) : null;
    const initialCategory = draft?.category || "ROAD";
    return draft
      ? {
          title: draft.title || "",
          description: draft.description || "",
          category: initialCategory,
          location: draft.location || "Naupada, Thane",
          priority: getPriorityForCategory(initialCategory),
          latitude: draft.latitude || "",
          longitude: draft.longitude || "",
        }
      : {
          title: "",
          description: "",
          category: "ROAD",
          location: "Naupada, Thane",
          priority: getPriorityForCategory("ROAD"),
          latitude: "",
          longitude: "",
        };
  });

  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [userChangedCategory, setUserChangedCategory] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [possibleDuplicates, setPossibleDuplicates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [locationResults, setLocationResults] = useState([]);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const idempotencyKeyRef = useRef(null);
  useEffect(() => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateUuid();
    }
  }, []);

  const detectCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toastError("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        try {
          const rev = await reverseGeocodeThane(lat, lng);
          if (rev) {
            setForm((prev) => ({
              ...prev,
              location: rev,
              latitude: lat,
              longitude: lng,
            }));
            success(`Detected location: ${rev}`);
          } else {
            setForm((prev) => ({
              ...prev,
              location: prev.location || `GPS Location (${lat}, ${lng})`,
              latitude: lat,
              longitude: lng,
            }));
            success("GPS coordinates detected successfully.");
          }
        } catch {
          success("GPS coordinates detected successfully.");
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        console.warn("Geolocation warning:", err.message);
        toastError("Could not retrieve GPS location automatically. Please enter your address or pin the map.");
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    if (step === 2 && !form.latitude && !form.location) {
      detectCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Autosave draft
  useEffect(() => {
    if (user?.email && (form.title || form.description)) {
      writeComplaintDraft(user.email, form);
    }
  }, [form, user]);

  const handleTextChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (newCategory, fromUser = true) => {
    if (fromUser) setUserChangedCategory(true);
    const autoPriority = getPriorityForCategory(newCategory);
    setForm((prev) => ({
      ...prev,
      category: newCategory,
      priority: autoPriority,
    }));
  };

  const handleAutoClassify = useCallback(async (titleText = form.title, descText = form.description) => {
    const text = `${titleText || ""} ${descText || ""}`.trim();
    if (text.length < 3) return;
    setClassifying(true);
    try {
      const res = await classifyComplaint({
        title: titleText || "Civic Complaint",
        description: descText || titleText,
        location: form.location || "Thane",
        text,
      });
      if (res?.category) {
        setSuggestedCategory(res.category);
        if (!userChangedCategory) {
          handleCategoryChange(res.category, false);
        }
      }
    } catch {
      // Ignore classification errors
    } finally {
      setClassifying(false);
    }
  }, [form.location, form.title, form.description, userChangedCategory]);

  useEffect(() => {
    const text = `${form.title} ${form.description}`.trim();
    if (text.length < 3) return;
    const timer = setTimeout(() => {
      handleAutoClassify(form.title, form.description);
    }, 500);
    return () => clearTimeout(timer);
  }, [form.title, form.description, handleAutoClassify]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleMapPin = async (lat, lng) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    try {
      const rev = await reverseGeocodeThane(lat, lng);
      if (rev) {
        setForm((prev) => ({ ...prev, location: rev, latitude: lat, longitude: lng }));
      }
    } catch {
      // Keep manual location
    }
  };

  const handleLocationSearchChange = (q) => {
    if (q.trim().length >= 2) {
      setLocationResults(searchThaneLocations(q));
    } else {
      setLocationResults([]);
    }
  };

  const handleProceedToReview = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      toastError("Please complete title, description, and location.");
      return;
    }
    setCheckingDuplicates(true);
    try {
      const dups = await checkDuplicates({
        title: form.title,
        category: form.category,
        description: form.description,
        location: form.location,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      const list = Array.isArray(dups) ? dups : dups?.duplicates || [];
      if (list.length > 0) {
        setPossibleDuplicates(list);
        warning("Possible duplicate complaints detected in your area.");
      } else {
        setPossibleDuplicates([]);
      }
    } catch {
      // Continue even if duplicate check fails
    } finally {
      setCheckingDuplicates(false);
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("title", form.title.trim());
      data.append("description", form.description.trim());
      data.append("category", form.category);
      data.append("location", form.location.trim());
      data.append("priority", form.priority);
      if (form.latitude && form.longitude) {
        data.append("latitude", form.latitude);
        data.append("longitude", form.longitude);
      }
      if (imageFile) {
        data.append("image", imageFile);
      }

      const res = await submitComplaint(data, idempotencyKeyRef.current);
      idempotencyKeyRef.current = generateUuid();
      if (user?.email) clearComplaintDraft(user.email);
      success(`Grievance submitted successfully! Reference: ${res.complaintNumber || "Generated"}`);
      navigate(`/dashboard`);
    } catch (err) {
      toastError(err.message || "Failed to submit grievance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: "Issue Details" },
    { num: 2, title: "Location & Evidence" },
    { num: 3, title: "Review & Submit" },
  ];

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%" }}>
      <div className="card" style={{ padding: "var(--space-8)", boxShadow: "var(--shadow-md)" }}>
        {/* Title Header */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--primary-600)",
            }}
          >
            TMC Civic Intake Portal
          </span>
          <h1 style={{ fontSize: "1.625rem", marginTop: "2px", letterSpacing: "-0.02em" }}>
            Lodge a Municipal Grievance
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Direct digital dispatch to Thane ward engineering squads
          </p>
        </div>

        {/* Clean Modern Stepper Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-8)",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "var(--space-4)",
          }}
        >
          {stepsList.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                onClick={() => isDone && setStep(s.num)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: isDone ? "pointer" : "default",
                  opacity: isActive || isDone ? 1 : 0.45,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: isActive
                      ? "var(--primary-600)"
                      : isDone
                      ? "#10b981"
                      : "var(--bg-subtle)",
                    color: isActive || isDone ? "#ffffff" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                  }}
                >
                  {isDone ? <CheckCircle2 size={16} /> : s.num}
                </div>
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step 1: Issue Details */}
        {step === 1 && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">
                Issue Summary / Title
              </label>
              <input
                id="title"
                className="form-input"
                placeholder="e.g. Deep pothole on Gokhale Road near Thane Station West"
                value={form.title}
                onChange={(e) => handleTextChange("title", e.target.value)}
                onBlur={handleAutoClassify}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Detailed Grievance Description
              </label>
              <textarea
                id="description"
                className="form-textarea"
                rows={4}
                placeholder="Describe the issue in detail, including nearby landmarks, hazards, and how long it has persisted..."
                value={form.description}
                onChange={(e) => handleTextChange("description", e.target.value)}
                onBlur={handleAutoClassify}
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="form-label" htmlFor="category" style={{ margin: 0 }}>
                  Municipal Category
                </label>
                {classifying && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Sparkles size={12} /> Analyzing keywords...
                  </span>
                )}
                {suggestedCategory && !classifying && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.75rem",
                      backgroundColor: "var(--primary-50)",
                      color: "var(--primary-800)",
                      border: "1px solid var(--primary-200)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <Sparkles size={12} style={{ color: "var(--primary-600)" }} />
                    <span>
                      Suggested: <strong>{CATEGORIES.find((c) => c.value === suggestedCategory)?.label || suggestedCategory}</strong>
                    </span>
                    {form.category !== suggestedCategory && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ height: "20px", padding: "0 6px", fontSize: "0.6875rem", marginLeft: "4px" }}
                        onClick={() => handleCategoryChange(suggestedCategory, false)}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                )}
              </div>
              <select
                id="category"
                className="form-select"
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Severity / Redressal Priority</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <ShieldCheck size={13} style={{ color: "var(--primary-600)" }} /> Auto-assigned by Category SLA Policy
                </span>
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 14px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-subtle)",
                  border: "1px solid var(--border-default)",
                  height: "44px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <PriorityBadge priority={form.priority} />
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {CATEGORY_PRIORITY_MAP[form.category]?.reason || "Standard Municipal Redressal"}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-surface)",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  System Determined
                </span>
              </div>
              <span className="form-hint" style={{ marginTop: "4px" }}>
                Municipal response SLAs are automatically enforced based on the issue type.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!form.title.trim() || !form.description.trim()) {
                    toastError("Please provide both title and description.");
                    return;
                  }
                  setStep(2);
                }}
              >
                <span>Continue to Location</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Location & Evidence */}
        {step === 2 && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-2)",
                }}
              >
                <label className="form-label" htmlFor="location" style={{ marginBottom: 0 }}>
                  Ward Area / Street Address in Thane
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={detectCurrentLocation}
                  disabled={detectingLocation}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {detectingLocation ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={13} style={{ color: "var(--primary-600)" }} />
                      <span>Auto-Detect Location</span>
                    </>
                  )}
                </button>
              </div>
              <input
                id="location"
                className="form-input"
                placeholder="Search or enter area (e.g. Naupada, Pachpakhadi, Ghodbunder Rd)"
                value={form.location}
                onChange={(e) => {
                  handleTextChange("location", e.target.value);
                  handleLocationSearchChange(e.target.value);
                }}
              />
              {locationResults.length > 0 && (
                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    maxHeight: "140px",
                    overflowY: "auto",
                    marginTop: "4px",
                    boxShadow: "var(--shadow-md)",
                    zIndex: 10,
                  }}
                >
                  {locationResults.map((loc) => (
                    <div
                      key={loc.name}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          location: `${loc.name}, ${loc.area}, Thane`,
                          latitude: loc.lat.toFixed(6),
                          longitude: loc.lon.toFixed(6),
                        }));
                        setLocationResults([]);
                      }}
                    >
                      <MapPin size={14} style={{ color: "var(--primary-600)", flexShrink: 0 }} />
                      <div>
                        <strong>{loc.name}</strong> ({loc.area}, Ward {loc.ward})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Pin Location on Thane Ward Map (Interactive)</label>
              <LocationPicker latitude={form.latitude} longitude={form.longitude} onLocationSelect={handleMapPin} />
            </div>

            <div className="form-group">
              <label className="form-label">Photo Evidence (JPG or PNG)</label>
              <input type="file" accept="image/jpeg,image/png" onChange={handleImageChange} className="form-input" />
              {imagePreview && (
                <div style={{ marginTop: "var(--space-2)" }}>
                  <img
                    src={imagePreview}
                    alt="Evidence Preview"
                    style={{
                      maxHeight: "180px",
                      borderRadius: "var(--radius-md)",
                      objectFit: "cover",
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "var(--space-6)",
                paddingTop: "var(--space-4)",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={checkingDuplicates}
                onClick={handleProceedToReview}
              >
                <span>{checkingDuplicates ? "Checking Duplicates..." : "Review Submission"}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {possibleDuplicates.length > 0 && (
              <div
                className="card"
                style={{
                  backgroundColor: "var(--status-progress-bg)",
                  borderColor: "var(--status-progress-border)",
                  padding: "var(--space-4)",
                }}
              >
                <h4
                  style={{
                    color: "var(--status-progress-text)",
                    fontSize: "0.875rem",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>Similar grievances recently reported nearby:</span>
                </h4>
                <ul style={{ paddingLeft: "20px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {possibleDuplicates.slice(0, 3).map((d) => (
                    <li key={d.complaintNumber || d.id} style={{ marginBottom: "2px" }}>
                      <strong>{d.title}</strong> ({d.status}) — {d.location}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Review Summary Card */}
            <div
              style={{
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                padding: "var(--space-5)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Category
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{form.category}</div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Priority
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{form.priority} Priority</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Title
                </div>
                <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)" }}>{form.title}</div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Location in Thane
                </div>
                <div style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-secondary)" }}>{form.location}</div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Description
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "2px", whiteHeight: "1.5" }}>
                  {form.description}
                </p>
              </div>

              {imagePreview && (
                <div style={{ marginTop: "var(--space-2)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                    Evidence Attachment
                  </div>
                  <img
                    src={imagePreview}
                    alt="Evidence"
                    style={{ maxHeight: "120px", borderRadius: "var(--radius-sm)", objectFit: "cover" }}
                  />
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "var(--space-4)",
                paddingTop: "var(--space-4)",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-accent btn-lg"
                disabled={submitting}
                onClick={handleSubmit}
              >
                <span>{submitting ? "Lodging Complaint..." : "Confirm & Lodge Grievance"}</span>
                <CheckCircle2 size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
