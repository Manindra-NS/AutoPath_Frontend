/**
 * @file routeNormalizer.js
 * 
 * Centralized Route & Coordinate Transformation Layer.
 * 
 * Separates API payload transformations and data normalization from map rendering:
 * 1. Validates coordinate integrity (numbers, finite, bounds).
 * 2. Detects and normalizes coordinate order (converts GeoJSON [lng, lat] to Leaflet [lat, lng]).
 * 3. Handles object format ({ lat, lng } or { latitude, longitude }).
 * 4. Normalizes startStop, destinationStop, and ordered intermediate stops.
 * 5. Flags invalid or missing road geometry so that the map layer NEVER falls back
 *    to misleading straight-line representations.
 */

/**
 * Validates a single coordinate pair [lat, lng].
 * Ensures values are finite numbers and within global geographic bounds.
 * Also intelligently handles inverted [lng, lat] (GeoJSON convention).
 *
 * @param {Array|Object} raw - Raw coordinate pair or object
 * @returns {[number, number]|null} Normalized [lat, lng] or null if invalid
 */
export function normalizeSingleCoordinate(raw) {
  if (!raw) return null;

  let lat, lng;

  // Handle object formats: { lat, lng } or { latitude, longitude }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    lat = raw.lat ?? raw.latitude;
    lng = raw.lng ?? raw.lon ?? raw.long ?? raw.longitude;
  } else if (Array.isArray(raw) && raw.length >= 2) {
    const first = Number(raw[0]);
    const second = Number(raw[1]);

    if (!Number.isFinite(first) || !Number.isFinite(second)) {
      return null;
    }

    // Auto-detect GeoJSON [longitude, latitude] vs Leaflet [latitude, longitude]:
    // In India / Kolkata: Lat is ~22°N, Long is ~88°E.
    // Globally: Lat is between -90 and +90. Long is between -180 and +180.
    // If the first number is > 60 and second number is < 40 (or first is clearly longitude):
    if (first > 60 && second <= 40 && second >= -40) {
      // It's [longitude, latitude] -> convert to [latitude, longitude]
      lat = second;
      lng = first;
    } else if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
      // First is out of latitude range, must be [lng, lat]
      lat = second;
      lng = first;
    } else {
      // Standard [lat, lng]
      lat = first;
      lng = second;
    }
  } else {
    return null;
  }

  lat = Number(lat);
  lng = Number(lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return [lat, lng];
}

/**
 * Normalizes an array of coordinates into Leaflet-ready [[lat, lng], ...].
 * Validates that at least 2 coordinate points exist along the road.
 *
 * @param {Array|Object} rawCoordinates - Array of coordinates or GeoJSON geometry object
 * @returns {{ valid: boolean, coordinates: Array<[number, number]>, error?: string }}
 */
export function normalizeCoordinates(rawCoordinates) {
  if (!rawCoordinates) {
    return { valid: false, coordinates: [], error: 'No geometry provided.' };
  }

  // Handle GeoJSON Feature or Geometry: { type: "LineString", coordinates: [...] }
  let coordinateList = rawCoordinates;
  if (rawCoordinates.type === 'Feature' && rawCoordinates.geometry) {
    coordinateList = rawCoordinates.geometry.coordinates;
  } else if (rawCoordinates.type === 'LineString' && Array.isArray(rawCoordinates.coordinates)) {
    coordinateList = rawCoordinates.coordinates;
  }

  if (!Array.isArray(coordinateList) || coordinateList.length < 2) {
    return {
      valid: false,
      coordinates: [],
      error: 'Route geometry must contain at least 2 coordinates.'
    };
  }

  const normalized = [];
  for (let i = 0; i < coordinateList.length; i++) {
    const point = normalizeSingleCoordinate(coordinateList[i]);
    if (point) {
      normalized.push(point);
    } else {
      console.warn(`[routeNormalizer] Skipped malformed coordinate at index ${i}:`, coordinateList[i]);
    }
  }

  if (normalized.length < 2) {
    return {
      valid: false,
      coordinates: [],
      error: 'Malformed coordinates: fewer than 2 valid road points resolved.'
    };
  }

  return {
    valid: true,
    coordinates: normalized
  };
}

/**
 * Normalizes a stop object ensuring valid [lat, lng] coordinates and attributes.
 *
 * @param {Object} rawStop - Stop object from backend
 * @param {number} defaultOrder - Fallback order index
 * @returns {Object} Normalized stop object
 */
export function normalizeStop(rawStop, defaultOrder = 1) {
  if (!rawStop) return null;

  const coords = normalizeSingleCoordinate(
    rawStop.coordinates || rawStop.coords || [rawStop.latitude || rawStop.lat, rawStop.longitude || rawStop.lng]
  );

  return {
    id: String(rawStop.id || rawStop.stopId || `stop-${defaultOrder}`),
    name: rawStop.name || 'Auto Stop',
    bengaliName: rawStop.bengaliName || rawStop.name || 'অটো স্টপ',
    hindiName: rawStop.hindiName || '',
    order: typeof rawStop.order === 'number' ? rawStop.order : defaultOrder,
    distance: rawStop.distance || `${rawStop.distKm || 0} km`,
    distKm: Number(rawStop.distKm ?? rawStop.distanceKm ?? 0),
    badge: rawStop.badge || null,
    badgeIcon: rawStop.badgeIcon || null,
    subtext: rawStop.subtext || '',
    isStand: Boolean(rawStop.isStand),
    isTransfer: Boolean(rawStop.isTransfer),
    coordinates: coords
  };
}

/**
 * Centralized Route Normalizer.
 * Transforms any backend route payload (or mock route) into a consistent, validated contract.
 *
 * Guarantees:
 * - `hasValidGeometry`: true ONLY if pathCoordinates has >= 2 verified road coordinates.
 * - `pathCoordinates`: strictly [[lat, lng], ...] in Leaflet order.
 * - `stops`: strictly ordered intermediate stops array.
 * - `startStop` & `destinationStop`: resolved endpoints.
 *
 * @param {Object} raw - Raw route data from API or mock adapter
 * @returns {Object} Normalized route
 */
export function normalizeRouteData(raw) {
  if (!raw) return null;

  // Extract raw path coordinates from various backend conventions
  const rawPath = 
    raw.pathCoordinates || 
    raw.path_coordinates || 
    raw.geometry || 
    raw.roadGeometry || 
    raw.coordinates ||
    (raw.routeGeometry && raw.routeGeometry.coordinates);

  const geomResult = normalizeCoordinates(rawPath);

  // Normalize stops
  const rawStops = Array.isArray(raw.stops) ? raw.stops : (raw.intermediateStops || []);
  const normalizedStops = rawStops
    .map((s, idx) => normalizeStop(s, idx + 1))
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

  // Start & Destination stops
  const startStop = raw.startStop ? normalizeStop(raw.startStop, 0) : (normalizedStops[0] || null);
  const destinationStop = raw.destinationStop 
    ? normalizeStop(raw.destinationStop, normalizedStops.length + 1)
    : (normalizedStops[normalizedStops.length - 1] || null);

  return {
    id: String(raw.id || raw.routeId),
    code: raw.code || raw.routeCode || 'AK-AUTO',
    codeAlt: raw.codeAlt || '',
    name: raw.name || `${startStop?.name || 'Origin'} ⇄ ${destinationStop?.name || 'Destination'}`,
    subtitle: raw.subtitle || '',
    bengaliName: raw.bengaliName || raw.name || '',
    bengaliSubtitle: raw.bengaliSubtitle || '',
    hindiName: raw.hindiName || '',
    originStandId: raw.originStandId || raw.origin_stand_id || startStop?.id || '',
    destinationStandId: raw.destinationStandId || raw.destination_stand_id || destinationStop?.id || '',
    
    // Road network geometry
    hasValidGeometry: geomResult.valid,
    pathCoordinates: geomResult.coordinates, // Guaranteed [lat, lng] order for Leaflet
    geometryError: geomResult.error || null,
    
    // Ordered intermediate stops
    startStop,
    destinationStop,
    stops: normalizedStops,
    
    // Metadata
    fareRange: raw.fareRange || raw.fare_range || '₹12 - ₹15',
    fareFixed: raw.fareFixed || raw.fare_fixed || '₹15 Fixed',
    govtShareFare: raw.govtShareFare || raw.govt_share_fare || '',
    fareType: raw.fareType || raw.fare_type || 'Per Seat Share',
    distance: raw.distance || '~4.0 km',
    distanceKm: Number(raw.distanceKm ?? raw.distance_km ?? 4.0),
    estTravel: raw.estTravel || raw.est_travel || '15-20m',
    estTravelMin: Number(raw.estTravelMin ?? raw.est_travel_min ?? 18),
    queueFreq: raw.queueFreq || raw.queue_freq || '2-4 min',
    isDirect: raw.isDirect !== false,
    routeType: raw.routeType || 'direct',
    category: raw.category || '',
    status: raw.status || 'Active Queue Now',
    notes: raw.notes || ''
  };
}
