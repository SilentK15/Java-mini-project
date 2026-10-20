// Thane Municipal Corporation (TMC) Localities, Wards & Landmarks Database
// Provides instant offline autocomplete + live OpenStreetMap Nominatim integration

export const THANE_WARDS = [
  "Naupada-Kopri",
  "Panchpakhadi",
  "Wagle Estate",
  "Vartak Nagar",
  "Majiwada-Manpada",
  "Upvan-Yeoor",
  "Ghodbunder Road",
  "Kalwa",
  "Mumbra",
  "Diva",
  "Thane East",
];

export const THANE_LOCALITIES = Object.freeze([
  { name: "Naupada", area: "Ward 1 · Naupada-Kopri", lat: 19.1868, lon: 72.9754, landmark: "Gokhale Road / Talao Pali" },
  { name: "Talao Pali (Masunda Lake)", area: "Ward 1 · Naupada", lat: 19.1910, lon: 72.9730, landmark: "Shivaji Maidan / Gadkari Rangayatan" },
  { name: "Thane Railway Station West", area: "Ward 1 · Naupada", lat: 19.1860, lon: 72.9760, landmark: "SATIS Elevated Deck / Platform 1" },
  { name: "Panchpakhadi", area: "Ward 2 · Panchpakhadi", lat: 19.1932, lon: 72.9647, landmark: "TMC Headquarters / Mahapalika Bhavan" },
  { name: "Teen Hath Naka", area: "Ward 2 · Naupada", lat: 19.1882, lon: 72.9625, landmark: "LBS Marg / Eastern Express Highway" },
  { name: "Cadbury Junction", area: "Ward 2 · Panchpakhadi", lat: 19.2025, lon: 72.9680, landmark: "Nitin Company / Service Road" },
  { name: "Wagle Industrial Estate", area: "Ward 3 · Wagle Estate", lat: 19.1973, lon: 72.9491, landmark: "Road No. 16 / Passport Office" },
  { name: "Kisan Nagar", area: "Ward 3 · Wagle Estate", lat: 19.1915, lon: 72.9432, landmark: "Bhatwadi / Wagle Police Station" },
  { name: "Ambika Nagar", area: "Ward 3 · Wagle Estate", lat: 19.1995, lon: 72.9380, landmark: "Road No. 22 / Wagle Bus Depot" },
  { name: "Vartak Nagar", area: "Ward 4 · Vartak Nagar", lat: 19.2104, lon: 72.9612, landmark: "Kores Road / Pokhran Road 1" },
  { name: "Shastri Nagar", area: "Ward 4 · Vartak Nagar", lat: 19.2150, lon: 72.9630, landmark: "Pokhran Road 2 / Upvan Junction" },
  { name: "Upvan Lake", area: "Ward 5 · Upvan-Yeoor", lat: 19.2224, lon: 72.9634, landmark: "Yeoor Hills foothills / Sanskruti Arts" },
  { name: "Majiwada Junction", area: "Ward 6 · Majiwada-Manpada", lat: 19.2138, lon: 72.9815, landmark: "Lodha Paradise / Mumbai-Nashik Highway" },
  { name: "Viviana Mall", area: "Ward 6 · Majiwada", lat: 19.2090, lon: 72.9715, landmark: "Next to Jupiter Hospital / EEH" },
  { name: "Jupiter Hospital", area: "Ward 6 · Majiwada", lat: 19.2078, lon: 72.9722, landmark: "Eastern Express Highway Service Road" },
  { name: "Kapurbawdi", area: "Ward 6 · Majiwada", lat: 19.2183, lon: 72.9822, landmark: "Kapurbawdi Circle / Ghodbunder Start" },
  { name: "Balkum", area: "Ward 6 · Majiwada", lat: 19.2248, lon: 72.9972, landmark: "Balkum Naka / Dosti West County" },
  { name: "Dhokali", area: "Ward 6 · Majiwada", lat: 19.2201, lon: 72.9876, landmark: "Highland Park / Kolshet Road" },
  { name: "Kolshet", area: "Ward 6 · Majiwada", lat: 19.2312, lon: 72.9950, landmark: "Lodha Amara / Air Force Station" },
  { name: "Manpada", area: "Ward 7 · Ghodbunder Road", lat: 19.2372, lon: 72.9778, landmark: "D-Mart Manpada / Ghodbunder Road" },
  { name: "Patlipada", area: "Ward 7 · Ghodbunder Road", lat: 19.2450, lon: 72.9730, landmark: "Hiranandani Estate Arch Gate" },
  { name: "Hiranandani Estate", area: "Ward 7 · Ghodbunder Road", lat: 19.2505, lon: 72.9825, landmark: "The Walk / Rodas Enclave" },
  { name: "Brahmand", area: "Ward 7 · Ghodbunder Road", lat: 19.2492, lon: 72.9682, landmark: "Phase 1-8 / Azad Nagar" },
  { name: "Waghbil", area: "Ward 8 · Ghodbunder Road", lat: 19.2562, lon: 72.9715, landmark: "Suraj Water Park / Waghbil Naka" },
  { name: "Kasarvadavali", area: "Ward 8 · Ghodbunder Road", lat: 19.2708, lon: 72.9664, landmark: "TMC Fire Station / Hypercity" },
  { name: "Owale", area: "Ward 8 · Ghodbunder Road", lat: 19.2785, lon: 72.9620, landmark: "Gaimukh View / Sanjay Gandhi NP Border" },
  { name: "Gaimukh Chowpatty", area: "Ward 8 · Ghodbunder Road", lat: 19.2995, lon: 72.9628, landmark: "Thane Creek Promenade / Nagla Bunder" },
  { name: "Kopri (Thane East)", area: "Ward 9 · Thane East", lat: 19.1794, lon: 72.9749, landmark: "Daulat Nagar / Mith Bunder Road" },
  { name: "Kalwa Naka", area: "Ward 10 · Kalwa", lat: 19.1982, lon: 72.9942, landmark: "Chhatrapati Shivaji Maharaj Hospital" },
  { name: "Kharegaon", area: "Ward 10 · Kalwa", lat: 19.2085, lon: 73.0012, landmark: "Kharegaon Phatak / Parsik Hill" },
  { name: "Mumbra", area: "Ward 11 · Mumbra", lat: 19.1834, lon: 73.0185, landmark: "Mumbra Railway Station / Old Pune Road" },
  { name: "Kausa", area: "Ward 11 · Mumbra", lat: 19.1678, lon: 73.0234, landmark: "MM Valley / Shimla Park / Kausa Talao" },
  { name: "Shilphata", area: "Ward 12 · Diva-Shil", lat: 19.1482, lon: 73.0402, landmark: "Mahape-Kalyan Junction / Palava Phase 1" },
  { name: "Diva Railway Station", area: "Ward 12 · Diva", lat: 19.1895, lon: 73.0425, landmark: "Diva East / Sabe Gaon / Agasan Road" },
]);

// Search local database first, then fetch live from OpenStreetMap Nominatim
export async function searchThaneLocations(query) {
  if (!query || typeof query !== "string") return [];
  const clean = query.trim().toLowerCase();
  if (clean.length < 1) return [];

  // 1. Instant local match
  const localMatches = THANE_LOCALITIES.filter((loc) => {
    return (
      loc.name.toLowerCase().includes(clean) ||
      loc.area.toLowerCase().includes(clean) ||
      loc.landmark.toLowerCase().includes(clean)
    );
  }).slice(0, 6);

  // 2. If short query or we have abundant local matches, return local
  if (clean.length < 3) {
    return localMatches;
  }

  // 3. Query OpenStreetMap Nominatim API for live street-level accuracy
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      clean + ", Thane, Maharashtra"
    )}&addressdetails=1&limit=5&countrycodes=in`;

    const res = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: { "Accept-Language": "en" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const osmMatches = data.map((item) => {
        const parts = item.display_name.split(",");
        const title = parts[0]?.trim() || item.name;
        const subtitle = parts.slice(1, 4).join(",").trim() || "Thane, Maharashtra";
        return {
          name: title,
          area: subtitle,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          landmark: item.type ? item.type.replaceAll("_", " ") : "Municipal Location",
        };
      });

      // Combine with local matches, avoiding duplicates by similar name
      const existingNames = new Set(localMatches.map((m) => m.name.toLowerCase()));
      const filteredOsm = osmMatches.filter(
        (osm) => !existingNames.has(osm.name.toLowerCase())
      );
      return [...localMatches, ...filteredOsm].slice(0, 8);
    }
  } catch {
    // If Nominatim fails or times out, fallback seamlessly to local matches
  }

  return localMatches;
}

// Reverse Geocode given lat/lon to human readable address
export async function reverseGeocodeThane(lat, lon) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=17&addressdetails=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.address) {
        const road = data.address.road || data.address.pedestrian || data.address.suburb || "";
        const neighbourhood = data.address.neighbourhood || data.address.city_district || "";
        const city = data.address.city || "Thane";
        const parts = [road, neighbourhood, city].filter(Boolean);
        return parts.join(", ") || data.display_name.split(",").slice(0, 3).join(",");
      }
      return data.display_name ? data.display_name.split(",").slice(0, 3).join(",") : "";
    }
  } catch {
    // fallback
  }
  return "";
}
