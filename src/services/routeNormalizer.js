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
 * from stop names, and removes duplicate names wrapped in parentheses.
 *
 * @param {string} name - Raw stop name
 * @returns {string} Cleaned stop name
 */
export function cleanStopName(name) {
  if (!name || typeof name !== 'string') return '';
  let cleaned = name
    .replace(/\s*\((?:origin stand|origin|terminus|destination stand|destination|প্রারম্ভিক স্ট্যান্ড|টার্মিনাস)[^)]*\)/gi, '')
    .trim();

  // Remove duplicate name wrapped in parentheses: e.g. "Ruby General Hospital (Ruby General Hospital)" -> "Ruby General Hospital"
  const dupMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (dupMatch) {
    const mainPart = dupMatch[1].trim();
    const parenPart = dupMatch[2].trim();
    if (mainPart.toLowerCase() === parenPart.toLowerCase()) {
      cleaned = mainPart;
    }
  }

  return cleaned;
}

/**
 * Formats a stoppage display label combining primary and secondary/localized names
 * while eliminating duplicate names and empty parentheses.
 *
 * Rules:
 * 1. Display only the primary stoppage name when the primary name and secondary/localized name are identical.
 * 2. If both names are different, preserve the display format: "Primary (Secondary)".
 * 3. If the secondary name is empty, null, or undefined, display only the primary name without empty brackets.
 * 4. Case-insensitive, trimmed comparison to prevent duplicates caused by spaces or casing differences.
 * 5. If the primary name itself already contains duplicate text in parentheses (e.g. "Name (Name)"),
 *    cleans it to "Name".
 *
 * Examples:
 * - formatStoppageLabel('Ruby General Hospital', 'Ruby General Hospital') -> 'Ruby General Hospital'
 * - formatStoppageLabel('Gariahat', 'Gariahat') -> 'Gariahat'
 * - formatStoppageLabel('Ruby General Hospital', 'Ruby Hospital') -> 'Ruby General Hospital (Ruby Hospital)'
 * - formatStoppageLabel('Gariahat', null) -> 'Gariahat'
 *
 * @param {string} primary - Primary stoppage name
 * @param {string} [secondary] - Secondary or localized stoppage name
 * @returns {string} Formatted stoppage label without duplicate names
 */
export function formatStoppageLabel(primary, secondary) {
  if (!primary && !secondary) return '';

  let rawPrimary = cleanStopName(String(primary || '').trim());
  const basePrimary = rawPrimary.split('(')[0].trim() || rawPrimary;

  let cleanSecondary = String(secondary || '').trim();
  cleanSecondary = cleanSecondary.replace(/^\(|\)$/g, '').trim();

  // If secondary name is empty or null, return primary name without brackets
  if (!cleanSecondary) {
    return basePrimary;
  }

  // If primary name is empty, return secondary name
  if (!basePrimary) {
    return cleanSecondary;
  }

  // Case-insensitive, trimmed comparison
  if (basePrimary.toLowerCase() === cleanSecondary.toLowerCase()) {
    return basePrimary;
  }

  // Check if primary name already ends with the secondary name in parentheses
  if (basePrimary.toLowerCase().endsWith(`(${cleanSecondary.toLowerCase()})`)) {
    return basePrimary;
  }

  return `${basePrimary} (${cleanSecondary})`;
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
 * Distinguishes:
 * - Regular auto stands (terminals/stands)
 * - Intermediate passenger stoppages (named points along the corridor)
 * - Pure geometry points (no stoppage name, is_intermediate_stoppage: false)
 *
 * @param {Object} rawStop - Stop object from backend or mock
 * @param {number} defaultOrder - Fallback order index
 * @returns {Object} Normalized stop object
 */
export function normalizeStop(rawStop, defaultOrder = 1) {
  if (!rawStop) return null;

  const coords = normalizeSingleCoordinate(
    rawStop.coordinates || rawStop.coords || [rawStop.latitude || rawStop.lat, rawStop.longitude || rawStop.lng]
  );

  const isStand = Boolean(rawStop.isStand || rawStop.is_stand || rawStop.type === 'stand');
  const rawName = (rawStop.stoppage_name || rawStop.name || '').trim();
  
  // A point is an intermediate stoppage if:
  // - It is explicitly marked is_intermediate_stoppage: true
  // - OR it is NOT a stand, NOT geometry-only, and has a meaningful stoppage name
  const isExplicitIntermediate = Boolean(
    rawStop.is_intermediate_stoppage === true || 
    rawStop.isIntermediateStoppage === true || 
    rawStop.is_intermediate === true ||
    rawStop.stop_type === 'intermediate'
  );
  const isGeometryOnly = rawStop.is_intermediate_stoppage === false && !rawStop.stoppage_name;

  const isIntermediateStoppage = isExplicitIntermediate || (!isStand && !isGeometryOnly && Boolean(rawName));

  return {
    id: String(rawStop.id || rawStop.stopId || `stop-${defaultOrder}`),
    name: rawName || 'Auto Stop',
    bengaliName: rawStop.bengaliName || rawStop.bengali_name || rawName || 'অটো স্টপ',
    hindiName: rawStop.hindiName || rawStop.hindi_name || '',
    order: typeof rawStop.order === 'number' ? rawStop.order : (typeof rawStop.sequence === 'number' ? rawStop.sequence : defaultOrder),
    distance: rawStop.distance || `${rawStop.distKm || 0} km`,
    distKm: Number(rawStop.distKm ?? rawStop.distanceKm ?? 0),
    badge: rawStop.badge || null,
    badgeIcon: rawStop.badgeIcon || null,
    subtext: rawStop.subtext || '',
    isStand,
    isIntermediateStoppage,
    isTransfer: Boolean(rawStop.isTransfer || rawStop.is_transfer),
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
    
    // Directionality
    direction: raw.direction || (raw.is_bidirectional !== false && (rawRouteName.includes('⇄') || rawRouteName.includes('<->')) ? 'bidirectional' : 'one_way'),
    is_bidirectional: raw.is_bidirectional !== undefined 
      ? Boolean(raw.is_bidirectional) 
      : (raw.direction === 'bidirectional' || rawRouteName.includes('⇄') || rawRouteName.includes('<->')),

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

/**
 * Validates whether a location/stand object is a Regular Auto Stand.
 *
 * Rules:
 * - Actual auto stand or route starting/ending locations.
 * - Must NOT be an intermediate stoppage or geometry point.
 * - Connected to at least one active auto route (or registered stand hub).
 * - Should be rendered with the large yellow-green circular marker on the map.
 *
 * @param {Object} location - Stand or stop candidate
 * @param {Array} [allRoutes] - Available routes to inspect relationships
 * @returns {boolean} True if this is a regular auto stand
 */
export function isRegularAutoStand(location, allRoutes = []) {
  if (!location) return false;

  // 1. Explicit intermediate stoppage flags -> definitely NOT a regular auto stand
  if (
    location.is_intermediate_stoppage === true ||
    location.isIntermediateStoppage === true ||
    location.is_intermediate === true ||
    location.stop_type === 'intermediate' ||
    location.type === 'intermediate' ||
    location.type === 'stop' ||
    location.type === 'waypoint' ||
    location.isStand === false ||
    location.is_stand === false
  ) {
    return false;
  }

  // 2. Explicit stand indicators -> is a regular auto stand
  if (
    location.isStand === true ||
    location.is_stand === true ||
    location.type === 'stand' ||
    location.tier ||
    location.standFormat
  ) {
    return true;
  }

  // 3. Inspect route-to-stoppage relationships if routes are available
  if (Array.isArray(allRoutes) && allRoutes.length > 0) {
    const locId = String(location.id || location.standId || '').toLowerCase();
    const locName = cleanStopName(String(location.name || '')).toLowerCase();

    // Is it a terminal (origin or destination) of any route?
    const isTerminal = allRoutes.some((route) => {
      const origId = String(route.originStandId || route.origin_stand_id || route.startStop?.id || '').toLowerCase();
      const destId = String(route.destinationStandId || route.destination_stand_id || route.destinationStop?.id || '').toLowerCase();
      const origName = cleanStopName(String(route.originStandName || route.startStop?.name || '')).toLowerCase();
      const destName = cleanStopName(String(route.destinationStandName || route.destinationStop?.name || '')).toLowerCase();

      return (
        (locId && (origId === locId || destId === locId)) ||
        (locName && (origName === locName || destName === locName))
      );
    });

    if (isTerminal) return true;

    // Is it explicitly an intermediate stop on a route?
    const isIntermediate = allRoutes.some((route) => {
      const stops = route.stops || route.intermediateStops || [];
      return stops.some((s) => {
        if (s.isStand || s.is_stand) return false;
        const sId = String(s.id || '').toLowerCase();
        const sName = cleanStopName(String(s.name || s.stoppage_name || '')).toLowerCase();
        return (locId && sId === locId) || (locName && sName === locName);
      });
    });

    if (isIntermediate) return false;
  }

  // 4. Default: verify it has stand attributes (lines, landmarks, or queue format)
  return Boolean(location.activeLinesCount || location.landmarks || location.queueSystem);
}

/**
 * Validates whether a location/stop is an Intermediate Stoppage.
 *
 * Rules:
 * - Location along an auto route that passengers pass through or identify.
 * - Not an independent auto stand.
 * - Must NOT use regular yellow-green markers or appear on default map.
 * - Displayed ONLY when its specific route is selected.
 *
 * @param {Object} stop - Stop candidate
 * @returns {boolean} True if this is an intermediate stoppage
 */
export function isIntermediateStoppage(stop) {
  if (!stop) return false;
  if (stop.isStand === true || stop.is_stand === true) return false;

  if (
    stop.is_intermediate_stoppage === true ||
    stop.isIntermediateStoppage === true ||
    stop.is_intermediate === true ||
    stop.stop_type === 'intermediate' ||
    stop.type === 'stop' ||
    stop.type === 'intermediate'
  ) {
    return true;
  }

  // If not marked as a stand and has a valid stoppage name
  const name = (stop.stoppage_name || stop.name || '').trim();
  const isGeometryOnly = stop.is_intermediate_stoppage === false && !stop.stoppage_name;
  return Boolean(name) && !isGeometryOnly;
}

/**
 * Creates the reversed representation of a bidirectional route.
 * Preserves the exact road-following geometry coordinates and intermediate stoppage
 * coordinates, reversing their sequence for accurate opposite-direction travel.
 *
 * @param {Object} route - Base normalized route
 * @returns {Object} Reversed route object
 */
export function createReverseRoute(route) {
  if (!route) return null;

  const rawPath = route.pathCoordinates || [];
  const reversedPath = Array.isArray(rawPath) ? [...rawPath].reverse() : [];

  const rawStops = route.stops || [];
  const reversedStops = [...rawStops].reverse().map((stop, idx) => ({
    ...stop,
    order: idx + 1
  }));

  const originName = route.destinationStandName || route.destinationStop?.name || 'Destination';
  const destName = route.originStandName || route.startStop?.name || 'Origin';
  const cleanOrigin = cleanStopName(originName);
  const cleanDest = cleanStopName(destName);
  const reverseName = `${cleanOrigin} → ${cleanDest}`;

  return {
    ...route,
    id: `${route.id}-reverse`,
    baseRouteId: route.id,
    isReversed: true,
    direction: 'bidirectional',
    is_bidirectional: true,
    originStandId: route.destinationStandId,
    destinationStandId: route.originStandId,
    originStandName: cleanOrigin,
    destinationStandName: cleanDest,
    startStop: route.destinationStop ? { ...route.destinationStop, isStand: true, order: 1 } : null,
    destinationStop: route.startStop ? { ...route.startStop, isStand: true, order: reversedStops.length } : null,
    name: reverseName,
    bengaliName: reverseName,
    pathCoordinates: reversedPath,
    stops: reversedStops
  };
}
