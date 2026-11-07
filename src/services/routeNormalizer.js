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
 * Strips common endpoint descriptor suffixes such as "(Origin Stand)" or "(Terminus)"
 * from stop names to ensure clean location display.
 *
 * @param {string} name - Raw stop name
 * @returns {string} Cleaned stop name
 */
export function cleanStopName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\s*\((?:origin stand|origin|terminus|destination stand|destination|প্রারম্ভিক স্ট্যান্ড|টার্মিনাস)[^)]*\)/gi, '')
    .trim();
}

/**
 * Formats a route title as "Origin → Destination" without duplicating the origin or destination.
 *
 * 1. Prefers structured origin and destination fields from route data when available.
 * 2. If the existing route name contains both origin and destination (e.g. "Serampore Station to Maheshwari Ferry"
 *    or "Ruby More ⇄ Gariahat"), extracts them without prepending or appending duplicate names.
 * 3. Uses a clear directional arrow (→) between origin and destination.
 *
 * @param {Object} route - Route data object
 * @param {string} [defaultOrigin] - Fallback origin name (e.g. selected auto stand name)
 * @returns {string} Clean formatted route title
 */
export function formatRouteTitle(route, defaultOrigin = '') {
  if (!route) return '';

  // 1. Structured origin (explicit)
  let origin = 
    route.originStandName || 
    route.origin_stand_name || 
    route.originName || 
    route.origin_name || 
    route.origin || 
    '';

  // 2. Structured destination (explicit)
  let destination = 
    route.destinationStandName || 
    route.destination_stand_name || 
    route.destinationName || 
    route.destination_name || 
    route.destination || 
    '';

  const rawName = (route.name || route.route_name || route.routeName || '').trim();

  // If rawName contains both endpoints separated by an arrow, "to", or spaced dash:
  if (rawName) {
    const separatorRegex = /\s*(?:⇄|→|->|<->|\bto\b)\s*|\s+[-–—]\s+/i;
    const match = rawName.match(separatorRegex);

    if (match) {
      const parts = rawName.split(match[0]);
      if (parts.length >= 2) {
        const parsedOrigin = parts[0].trim();
        const parsedDest = parts.slice(1).join(' ').trim();

        if (!origin && parsedOrigin) {
          origin = parsedOrigin;
        }
        if (!destination && parsedDest) {
          destination = parsedDest;
        }
      }
    } else if (!destination) {
      // No separator found; if rawName starts with origin, extract the remainder as destination
      if (origin && rawName.toLowerCase().startsWith(origin.toLowerCase())) {
        const remaining = rawName.slice(origin.length).replace(/^[\s\-–—:to→⇄>]+/i, '').trim();
        destination = remaining || rawName;
      } else {
        destination = rawName;
      }
    }
  }

  // Fallbacks to defaultOrigin and startStop / destinationStop if still missing
  if (!origin) {
    origin = (route.startStop?.name ? cleanStopName(route.startStop.name) : '') || defaultOrigin || '';
  }
  if (!destination) {
    destination = (route.destinationStop?.name ? cleanStopName(route.destinationStop.name) : '') || '';
  }

  origin = cleanStopName(origin);
  destination = cleanStopName(destination);

  // Guard: if destination still contains origin (e.g. destination was set to "Serampore Station to Maheshwari Ferry")
  if (origin && destination) {
    const destSep = destination.match(/\s*(?:⇄|→|->|<->|\bto\b)\s*|\s+[-–—]\s+/i);
    if (destSep) {
      const destParts = destination.split(destSep[0]);
      if (destParts[0].trim().toLowerCase() === origin.toLowerCase()) {
        destination = destParts.slice(1).join(' ').trim();
      }
    } else if (destination.toLowerCase().startsWith(origin.toLowerCase())) {
      destination = destination.slice(origin.length).replace(/^[\s\-–—:to→⇄>]+/i, '').trim();
    }
  }

  if (origin && destination) {
    return `${origin} → ${destination}`;
  }

  return rawName || origin || destination || 'Auto Route';
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

  const rawRouteName = raw.name || raw.route_name || raw.routeName || '';

  const explicitOrigin = 
    raw.originStandName || 
    raw.origin_stand_name || 
    raw.originName || 
    raw.origin_name || 
    raw.origin || 
    '';

  const explicitDestination = 
    raw.destinationStandName || 
    raw.destination_stand_name || 
    raw.destinationName || 
    raw.destination_name || 
    raw.destination || 
    '';

  const normalizedTitle = formatRouteTitle({
    ...raw,
    name: rawRouteName,
    originStandName: explicitOrigin,
    destinationStandName: explicitDestination,
    startStop,
    destinationStop
  });

  const originStandName = explicitOrigin || (startStop?.name ? cleanStopName(startStop.name) : '');
  const destinationStandName = explicitDestination || (destinationStop?.name ? cleanStopName(destinationStop.name) : '');

  return {
    id: String(raw.id || raw.routeId),
    code: raw.code || raw.routeCode || 'AK-AUTO',
    codeAlt: raw.codeAlt || '',
    name: normalizedTitle || rawRouteName || `${startStop?.name || 'Origin'} → ${destinationStop?.name || 'Destination'}`,
    subtitle: raw.subtitle || '',
    bengaliName: raw.bengaliName || rawRouteName || '',
    bengaliSubtitle: raw.bengaliSubtitle || '',
    hindiName: raw.hindiName || '',
    originStandId: raw.originStandId || raw.origin_stand_id || startStop?.id || '',
    destinationStandId: raw.destinationStandId || raw.destination_stand_id || destinationStop?.id || '',
    originStandName,
    destinationStandName,
    
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
