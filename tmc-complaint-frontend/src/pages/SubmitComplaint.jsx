import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { LocationPicker } from "../components/LocationPicker.jsx";
import { classifyComplaint, checkDuplicates, submitComplaint } from "../api/complaints.js";
import { clearComplaintDraft, readComplaintDraft, writeComplaintDraft } from "../complaintDraft.js";
import { searchThaneLocations, reverseGeocodeThane } from "../locationData.js";

const CATEGORIES = [
  { value: "ROAD", label: "Roads & Potholes" },
  { value: "GARBAGE", label: "Garbage & Solid Waste" },
  { value: "WATER", label: "Water Supply & Leakage" },
  { value: "ELECTRICITY", label: "Electricity / Power Outage" },
  { value: "STREET_LIGHT", label: "Street Lighting" },
  { value: "DRAINAGE", label: "Drainage & Sewage Overflow" },
  { value: "OTHER", label: "Other Civic Issues" },
];

export function SubmitComplaint() {
  const { user } = useAuth();
  const { success, error: toastError, warning } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => {
    const draft = user?.email ? readComplaintDraft(user.email) : null;
    return draft
      ? {
          title: draft.title || "",
          description: draft.description || "",
          category: draft.category || "ROAD",
          location: draft.location || "Naupada, Thane",
          priority: draft.priority || "MEDIUM",
          latitude: draft.latitude || "",
          longitude: draft.longitude || "",
        }
      : {
          title: "",
          description: "",
          category: "ROAD",
          location: "Naupada, Thane",
          priority: "MEDIUM",
          latitude: "",
          longitude: "",
        };
  });

  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [possibleDuplicates, setPossibleDuplicates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [locationResults, setLocationResults] = useState([]);

  const idempotencyKeyRef = useRef(null);
  useEffect(() => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = "sub-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
    }
  }, []);

  // Autosave draft on form change
  useEffect(() => {
    if (user?.email && (form.title || form.description)) {
      writeComplaintDraft(user.email, form);
    }
  }, [form, user]);

  const handleTextChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Keyword classification trigger
  const handleAutoClassify = async () => {
    const text = `${form.title} ${form.description}`.trim();
    if (text.length < 5) return;
    setClassifying(true);
    try {
      const res = await classifyComplaint(text);
      if (res?.category) {
        setSuggestedCategory(res.category);
      }
    } catch {
      // Ignore classification errors
    } finally {
      setClassifying(false);
    }
  };

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
    const rev = reverseGeocodeThane(lat, lng);
    if (rev && !form.location) {
      setForm((prev) => ({ ...prev, location: rev }));
    }
  };

  const handleLocationSearchChange = (q) => {
    if (q.trim().length >= 2) {
      setLocationResults(searchThaneLocations(q));
    } else {
      setLocationResults([]);
    }
  };

  // Step progression with duplicate check
  const handleProceedToReview = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      toastError("Please complete title, description, and location.");
      return;
    }
    setCheckingDuplicates(true);
    try {
      const dups = await checkDuplicates({
        category: form.category,
        description: form.description,
        location: form.location,
      });
      if (Array.isArray(dups) && dups.length > 0) {
        setPossibleDuplicates(dups);
        warning("Possible duplicate complaints detected in your area.");
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
      if (user?.email) clearComplaintDraft(user.email);
      success(`Grievance submitted successfully! Reference: ${res.complaintNumber || "Generated"}`);
      navigate(`/dashboard`);
    } catch (err) {
      toastError(err.message || "Failed to submit grievance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", width: "100%" }}>
      <div className="card" style={{ padding: "var(--space-6)" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-1)" }}>Lodge a Municipal Grievance</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
          Thane Municipal Corporation Citizen Intake Portal
        </p>

        {/* Stepper tabs */}
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
          {["1. Issue Details", "2. Location & Photo", "3. Review & Submit"].map((label, idx) => (
            <button
              key={label}
              onClick={() => idx + 1 < step && setStep(idx + 1)}
              className={`btn btn-sm ${step === idx + 1 ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1 }}
            >
              {label}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Issue Title</label>
              <input
                id="title"
                className="form-input"
                placeholder="e.g. Deep pothole on Gokhale Road near station"
                value={form.title}
                onChange={(e) => handleTextChange("title", e.target.value)}
                onBlur={handleAutoClassify}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Detailed Description</label>
              <textarea
                id="description"
                className="form-textarea"
                rows={4}
                placeholder="Describe the problem, landmark, and severity..."
                value={form.description}
                onChange={(e) => handleTextChange("description", e.target.value)}
                onBlur={handleAutoClassify}
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="form-label" htmlFor="category">
                  Category {classifying && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(analyzing...)</span>}
                </label>
                {suggestedCategory && (
                  <span style={{ fontSize: "0.75rem", color: "var(--primary-600)" }}>
                    Suggested category (keyword-based): <strong>{suggestedCategory}</strong>{" "}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "1px 6px", fontSize: "0.75rem" }}
                      onClick={() => setForm((p) => ({ ...p, category: suggestedCategory }))}
                    >
                      Apply
                    </button>
                  </span>
                )}
              </div>
              <select
                id="category"
                className="form-select"
                value={form.category}
                onChange={(e) => handleTextChange("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="priority">Citizen Priority</label>
              <select
                id="priority"
                className="form-select"
                value={form.priority}
                onChange={(e) => handleTextChange("priority", e.target.value)}
              >
                <option value="LOW">Low - Routine issue</option>
                <option value="MEDIUM">Medium - Noticeable inconvenience</option>
                <option value="HIGH">High - Urgent / Safety Hazard</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!form.title.trim() || !form.description.trim()) {
                  toastError("Please provide title and description.");
                  return;
                }
                setStep(2);
              }}
              style={{ alignSelf: "flex-end" }}
            >
              Continue to Location & Evidence →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="location">Address / Ward Area in Thane</label>
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
                <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", maxHeight: "120px", overflowY: "auto", marginTop: "4px" }}>
                  {locationResults.map((loc) => (
                    <div
                      key={loc.name}
                      style={{ padding: "6px 12px", cursor: "pointer", fontSize: "0.8125rem", borderBottom: "1px solid var(--border-subtle)" }}
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
                      📍 <strong>{loc.name}</strong> ({loc.area}, Ward {loc.ward})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Pin Location on Thane Ward Map (Optional)</label>
              <LocationPicker latitude={form.latitude} longitude={form.longitude} onLocationSelect={handleMapPin} />
            </div>

            <div className="form-group">
              <label className="form-label">Photo Evidence (JPG or PNG)</label>
              <input type="file" accept="image/jpeg,image/png" onChange={handleImageChange} className="form-input" />
              {imagePreview && (
                <div style={{ marginTop: "var(--space-2)" }}>
                  <img src={imagePreview} alt="Preview" style={{ maxHeight: "160px", borderRadius: "var(--radius-md)", objectFit: "cover" }} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-4)" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={checkingDuplicates}
                onClick={handleProceedToReview}
              >
                {checkingDuplicates ? "Checking duplicates..." : "Review Submission →"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {possibleDuplicates.length > 0 && (
              <div className="card" style={{ backgroundColor: "var(--status-progress-bg)", borderColor: "var(--status-progress-border)", padding: "var(--space-3)" }}>
                <h4 style={{ color: "var(--status-progress-text)", fontSize: "0.875rem", marginBottom: "4px" }}>
                  ⚠️ Similar complaints recently reported nearby:
                </h4>
                <ul style={{ paddingLeft: "16px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {possibleDuplicates.slice(0, 3).map((d) => (
                    <li key={d.complaintNumber || d.id}>{d.title} ({d.status}) - {d.location}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card" style={{ backgroundColor: "var(--bg-subtle)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div><strong style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>TITLE:</strong> <div>{form.title}</div></div>
              <div><strong style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>CATEGORY:</strong> <div>{form.category} | Priority: {form.priority}</div></div>
              <div><strong style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>LOCATION:</strong> <div>{form.location}</div></div>
              <div><strong style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>DESCRIPTION:</strong> <p style={{ fontSize: "0.875rem" }}>{form.description}</p></div>
              {imagePreview && <div><strong style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>ATTACHMENT:</strong> 1 image attached</div>}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-4)" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-accent btn-lg"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Submitting..." : "Confirm & Lodge Complaint"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
