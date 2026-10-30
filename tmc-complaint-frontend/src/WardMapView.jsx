import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { THANE_WARDS, THANE_LOCALITIES } from "./locationData.js";
import "./WardMapView.css";

// Fix default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const THANE_CENTER = [19.1932, 72.9647]; // Thane Municipal Corp (Panchpakhadi)

function createCustomPin(color) {
  return L.divIcon({
    className: "custom-map-pin",
    html: `<div class="pin-marker" style="background-color: ${color};">
            <span class="pin-inner-dot"></span>
           </div>
           <div class="pin-pulse" style="border-color: ${color};"></div>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

const PIN_STYLES = {
  SUBMITTED: { color: "#dc2626" },
  IN_PROGRESS: { color: "#d97706" },
  RESOLVED: { color: "#16a34a" },
  REOPEN_REQUESTED: { color: "#9333ea" },
};

export function WardMapView({
  complaints = [],
  uiCopy = {},
  onSelectComplaint,
  formatDepartment,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [selectedWard, setSelectedWard] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Geocode complaints missing explicit coords using locality names
  const geocodedComplaints = useMemo(() => {
    return complaints.map((c) => {
      if (c.latitude && c.longitude) {
        return { ...c, lat: Number(c.latitude), lon: Number(c.longitude) };
      }
      // Attempt fuzzy match with Thane localities
      const locText = (c.location || "").toLowerCase();
      const match = THANE_LOCALITIES.find(
        (l) => locText.includes(l.name.toLowerCase()) || locText.includes(l.area.toLowerCase())
      );
      if (match) {
        return { ...c, lat: match.lat, lon: match.lon, ward: match.area };
      }
      // Deterministic pseudo-offset around center so it is visible
      const idSeed = (c.id || 1) % 17;
      const jitterLat = THANE_CENTER[0] + ((idSeed / 17) - 0.5) * 0.03;
      const jitterLon = THANE_CENTER[1] + ((((c.id || 1) % 13) / 13) - 0.5) * 0.03;
      return { ...c, lat: jitterLat, lon: jitterLon };
    });
  }, [complaints]);

  // Filter complaints based on user selection
  const filteredComplaints = useMemo(() => {
    return geocodedComplaints.filter((c) => {
      if (selectedStatus !== "ALL" && c.status !== selectedStatus) return false;
      if (selectedDept !== "ALL" && c.department !== selectedDept) return false;
      if (selectedWard !== "ALL") {
        const loc = (c.location || "").toLowerCase();
        const wardTarget = selectedWard.toLowerCase();
        if (!loc.includes(wardTarget) && !(c.ward || "").toLowerCase().includes(wardTarget)) {
          return false;
        }
      }
      return true;
    });
  }, [geocodedComplaints, selectedWard, selectedDept, selectedStatus]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: THANE_CENTER,
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · TMC CivicConnect GIS',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when filtered complaints change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds = [];

    filteredComplaints.forEach((comp) => {
      const pinCfg = PIN_STYLES[comp.status] || { color: "#475569" };
      const markerIcon = createCustomPin(pinCfg.color);
      const marker = L.marker([comp.lat, comp.lon], { icon: markerIcon });

      const popupContent = document.createElement("div");
      popupContent.className = "map-pin-popup";
      popupContent.innerHTML = `
        <div class="popup-header">
          <span class="popup-id">${comp.complaintNumber || "TMC-GRV"}</span>
          <span class="popup-status" style="background:${pinCfg.color}20; color:${pinCfg.color};">${comp.status}</span>
        </div>
        <h4 class="popup-title">${comp.title || "Civic Grievance"}</h4>
        <p class="popup-loc">${comp.location || "Thane"}</p>
        <div class="popup-meta">
          <span>${comp.department ? comp.department.replace(/_/g, " ") : "Municipal Dept"}</span>
          <span>${comp.priority || "MEDIUM"} Priority</span>
        </div>
        <button class="popup-btn" id="view-comp-${comp.id}">View Full Details →</button>
      `;

      popupContent.querySelector(`#view-comp-${comp.id}`)?.addEventListener("click", () => {
        if (onSelectComplaint) onSelectComplaint(comp);
      });

      marker.bindPopup(popupContent, { maxWidth: 300 });
      layer.addLayer(marker);
      bounds.push([comp.lat, comp.lon]);
    });

    if (bounds.length > 0 && map) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredComplaints, onSelectComplaint]);

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(THANE_CENTER, 13);
    }
  };

  return (
    <div className="ward-map-container card">
      {/* Map Control Header */}
      <div className="ward-map-header">
        <div>
          <p className="section-label">{uiCopy?.navWardMap || "WARD MAP VIEW"}</p>
          <h2 className="ward-map-title">{uiCopy?.wardMapTitle || "Interactive TMC Ward Grievance Map"}</h2>
          <p className="card-description">
            {uiCopy?.wardMapDesc || "Geospatial visualization of civic complaints across Thane Municipal Corporation wards."}
          </p>
        </div>
        <button type="button" className="text-button" onClick={handleResetCenter}>
          Center on TMC HQ
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="map-toolbar">
        <div className="map-filter-group">
          <label htmlFor="map-ward-filter">{uiCopy?.mapFilterWard || "Filter by Ward:"}</label>
          <select
            id="map-ward-filter"
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
          >
            <option value="ALL">{uiCopy?.mapAllWards || "All Thane Wards"}</option>
            {THANE_WARDS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        <div className="map-filter-group">
          <label htmlFor="map-dept-filter">{uiCopy?.mapFilterDept || "Department:"}</label>
          <select
            id="map-dept-filter"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {["PUBLIC_WORKS", "SOLID_WASTE", "WATER", "SEWERAGE", "STREET_LIGHTING", "OTHER"].map((d) => (
              <option key={d} value={d}>
                {formatDepartment ? formatDepartment(d) : d.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="map-filter-group">
          <label htmlFor="map-status-filter">{uiCopy?.mapFilterStatus || "Status:"}</label>
          <select
            id="map-status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted (Pending)</option>
            <option value="IN_PROGRESS">Action in Progress</option>
            <option value="RESOLVED">Resolved (ATR)</option>
            <option value="REOPEN_REQUESTED">Reopening Requested</option>
          </select>
        </div>

        <div className="map-stats-pill">
          <strong>{filteredComplaints.length}</strong> {uiCopy?.mapTotalPins || "Complaints Mapped"}
        </div>
      </div>

      {/* Map Legend */}
      <div className="map-legend">
        <div className="legend-item"><span className="legend-dot" style={{ background: "#dc2626" }} /> Submitted / Open</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: "#d97706" }} /> In Progress</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: "#16a34a" }} /> Resolved (ATR)</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: "#9333ea" }} /> Appeal / Reopen</div>
      </div>

      {/* Interactive Leaflet Map Canvas */}
      <div className="map-canvas-wrapper">
        <div ref={mapContainerRef} className="map-canvas" />
      </div>
      <p className="map-footer-hint">
        {uiCopy?.mapClickPinHint || "Click any marker to inspect complaint summary, SLA urgency, and quick actions."}
      </p>
    </div>
  );
}
