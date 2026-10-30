import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const THANE_CENTER = [19.1932, 72.9647];

export function LocationPicker({ latitude, longitude, onLocationSelect }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = latitude ? Number(latitude) : THANE_CENTER[0];
    const initialLng = longitude ? Number(longitude) : THANE_CENTER[1];

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: latitude && longitude ? 15 : 12,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    let marker;
    if (latitude && longitude) {
      marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      marker.on("dragend", (e) => {
        const { lat, lng } = e.target.getLatLng();
        onLocationSelect(lat.toFixed(6), lng.toFixed(6));
      });
      markerRef.current = marker;
    }

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const newMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
        newMarker.on("dragend", (ev) => {
          const pos = ev.target.getLatLng();
          onLocationSelect(pos.lat.toFixed(6), pos.lng.toFixed(6));
        });
        markerRef.current = newMarker;
      }
      onLocationSelect(lat.toFixed(6), lng.toFixed(6));
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (latitude && longitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      mapInstanceRef.current.panTo([lat, lng]);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const newMarker = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
        newMarker.on("dragend", (ev) => {
          const pos = ev.target.getLatLng();
          onLocationSelect(pos.lat.toFixed(6), pos.lng.toFixed(6));
        });
        markerRef.current = newMarker;
      }
    }
  }, [latitude, longitude, onLocationSelect]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div
        ref={mapContainerRef}
        style={{
          height: "220px",
          width: "100%",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)",
          overflow: "hidden",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <MapPin size={13} />
          Click or drag pin to mark exact issue location
        </span>
        {latitude && longitude ? (
          <span>{latitude}, {longitude}</span>
        ) : (
          <span>(Optional GPS coords)</span>
        )}
      </div>
    </div>
  );
}
