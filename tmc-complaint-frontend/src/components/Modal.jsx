import { useEffect } from "react";

export function Modal({ isOpen, onClose, title, children, maxWidth = "500px" }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "var(--bg-overlay)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface)",
          boxShadow: "var(--shadow-xl)",
          padding: "var(--space-6)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h2 id="modal-title" style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="btn btn-secondary btn-sm"
            style={{ width: "32px", height: "32px", padding: 0, borderRadius: "50%" }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
