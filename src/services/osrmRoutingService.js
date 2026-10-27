/**
 * osrmRoutingService.js — AutoPath Road-Following Route Adapter
 *
 * Uses the OSRM (Open Source Routing Machine) route API to produce
 * road-snapped, road-following geometry for auto-rickshaw corridors.
 * Stop coordinates from routesData.js are used as ordered waypoints,
 * so the route always threads through the real auto stops on actual roads.
 *
 * Provider:  Public OSRM demo server (router.project-osrm.org)
 *            Terms: https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server-usage-policy
 *            Limit: ~1 req/s, not for production. Replace with your own
 *                   OSRM / Valhalla instance in production.
 *
 * Coordinate convention:
 *   routesData.js stores  [lat, lng]  (Leaflet order)
 *   OSRM API expects      lng,lat     in the URL
 *   Leaflet polyline needs [lat, lng]
 *   All conversions are handled internally.
 */

// ─── Configuration ─────────────────────────────────────────────────────────

/**
 * OSRM base URL — override via .env → VITE_OSRM_BASE_URL
 * Default: public demo server. Deploy your own for production.
 */
const OSRM_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OSRM_BASE_URL) ||
  'https://router.project-osrm.org';

/**
 * OSRM routing profile. 'driving' is the best proxy for auto-rickshaws on
 * the public server. Switch to a custom 'auto' profile on your own instance.
 */
const OSRM_PROFILE = 'driving';

/** Hard request timeout in milliseconds */
const TIMEOUT_MS = 12_000;

/** In-memory geometry cache — keyed by routeId */
const geometryCache = new Map();

// ─── Internal helpers ───────────────────────────────────────────────────────

/** Convert Leaflet [lat, lng] to OSRM URL fragment "lng,lat" */
const toOsrmCoord = ([lat, lng]) => `${lng},${lat}`;

/** Convert GeoJSON [lng, lat] from OSRM response back to Leaflet [lat, lng] */
const toLeafletCoord = ([lng, lat]) => [lat, lng];

/** fetch() with a hard abort timeout */
const fetchWithTimeout = (url, ms = TIMEOUT_MS) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
};

// ─── Core fetch ─────────────────────────────────────────────────────────────

/**
 * Requests road-following geometry from OSRM for an ordered list of waypoints.
 *
 * @param {Array<[number,number]>} waypointsLatLng  Ordered [lat,lng] pairs
 * @returns {Promise<Array<[number,number]>>}        Leaflet [lat,lng] coordinate array
 * @throws  Descriptive Error on network failure, timeout, OSRM error, or empty geometry
 */
const fetchOsrmGeometry = async (waypointsLatLng) => {
  if (!waypointsLatLng || waypointsLatLng.length < 2) {
    throw new Error('At least 2 waypoints are required to request road geometry.');
  }

  const coordsStr = waypointsLatLng.map(toOsrmCoord).join(';');
  const url =
    `${OSRM_BASE}/route/v1/${OSRM_PROFILE}/${coordsStr}` +
    `?overview=full&geometries=geojson&steps=false`;

  let response;
  try {
    response = await fetchWithTimeout(url);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        `OSRM request timed out after ${TIMEOUT_MS / 1000}s. Check your internet connection.`
      );
    }
    throw new Error(`Network error reaching OSRM routing server: ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`OSRM server returned HTTP ${response.status} ${response.statusText}.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('OSRM returned an invalid (non-JSON) response body.');
  }

  if (data.code !== 'Ok') {
    throw new Error(`OSRM routing failed: ${data.code} — ${data.message || 'no detail'}`);
  }

  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) {
    throw new Error('OSRM returned a valid response but the route geometry is empty.');
  }

  return route.geometry.coordinates.map(toLeafletCoord);
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns road-following Leaflet geometry for a route from routesData.js.
 *
 * Resolution priority:
 *  1. In-memory cache         — instant, no network request
 *  2. route.verifiedGeometry  — pre-verified [lat,lng] array stored in routesData.js
 *                               Use this when the auto corridor differs from the
 *                               fastest driving path that OSRM would suggest.
 *  3. OSRM live query         — uses stop coordinates as ordered waypoints
 *
 * @param {object} route  A route object from routesData.js
 * @returns {Promise<{
 *   geometry: Array<[number,number]>,
 *   source: 'cache' | 'verified' | 'osrm',
 *   waypointCount: number,
 * }>}
 * @throws Error with a human-readable message when geometry cannot be obtained.
 *         Callers must handle the error — this service never silently returns
 *         a straight-line fallback.
 */
export const getRouteGeometry = async (route) => {
  if (!route?.id) {
    throw new Error('Cannot fetch route geometry: the route object has no id.');
  }

  // 1. Cache hit
  if (geometryCache.has(route.id)) {
    console.debug(`[OSRM] Cache hit — route "${route.id}"`);
    return { ...geometryCache.get(route.id), source: 'cache' };
  }

  // 2. Pre-verified geometry embedded in routesData.js
  //    To use: add  verifiedGeometry: [[lat,lng], ...]  to any route in routesData.js
  if (Array.isArray(route.verifiedGeometry) && route.verifiedGeometry.length >= 2) {
    console.info(`[OSRM] Using pre-verified geometry — route "${route.id}"`);
    const result = {
      geometry: route.verifiedGeometry,
      source: 'verified',
      waypointCount: route.stops?.length ?? 0,
    };
    geometryCache.set(route.id, result);
    return result;
  }

  // 3. OSRM live query — use stop coords as waypoints (auto route must pass through stops)
  const stopWaypoints = (route.stops ?? [])
    .filter((s) => Array.isArray(s.coordinates) && s.coordinates.length === 2)
    .map((s) => s.coordinates);

  // If stops lack coordinates, fall back to the coarser pathCoordinates array
  const waypoints =
    stopWaypoints.length >= 2 ? stopWaypoints : (route.pathCoordinates ?? []);

  if (waypoints.length < 2) {
    throw new Error(
      `Route "${route.id}" has no usable waypoints. ` +
      `Add coordinates to stops[] in routesData.js.`
    );
  }

  console.info(
    `[OSRM] Fetching road geometry — route "${route.id}" — ${waypoints.length} waypoints`
  );

  const geometry = await fetchOsrmGeometry(waypoints);

  const result = { geometry, source: 'osrm', waypointCount: waypoints.length };
  geometryCache.set(route.id, result);
  return result;
};

/**
 * Evicts a single route from the geometry cache.
 * Call this when the backend returns refreshed route data.
 * @param {string} routeId
 */
export const evictRouteCache = (routeId) => {
  geometryCache.delete(routeId);
};

/**
 * Clears the entire in-memory geometry cache.
 * Call when route definitions are globally refreshed.
 */
export const clearGeometryCache = () => {
  geometryCache.clear();
  console.info('[OSRM] Full geometry cache cleared.');
};

/** Returns the OSRM base URL in use (for diagnostics). */
export const getOsrmBaseUrl = () => OSRM_BASE;
