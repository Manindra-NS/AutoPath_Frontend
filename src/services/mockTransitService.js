import { autoStands } from '../data/standsData';
import { routesData } from '../data/routesData';
import { createReverseRoute } from './routeNormalizer';

/**
 * Helper to simulate realistic network delay during frontend development.
 */
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extracts all unique location entries from the route database.
 * Includes auto stands, start stops, destination stops, and all intermediate stops.
 * Deduplicates by normalized name to avoid showing the same location twice.
 * 
 * This simulates what the real backend would do: search across all known locations.
 */
function buildLocationIndex() {
  const seen = new Map(); // normalized name -> location entry

  const addLocation = (name, bengaliName, id, description, isStand, coordinates) => {
    if (!name) return;
    // Strip common suffixes like "(Origin Stand)", "(Terminus)" for deduplication key
    const cleanName = name
      .replace(/\s*\((?:origin stand|origin|terminus|destination stand|destination)[^)]*\)/gi, '')
      .trim();
    const key = cleanName.toLowerCase();
    if (seen.has(key)) return;
    seen.set(key, {
      id: id || `loc-${key.replace(/\s+/g, '-')}`,
      name: cleanName,
      bengaliName: bengaliName || '',
      description: description || '',
      isStand: Boolean(isStand),
      coordinates: coordinates || null,
      type: isStand ? 'stand' : 'stop'
    });
  };

  // 1. Add all registered auto stands
  for (const stand of autoStands) {
    addLocation(
      stand.name,
      stand.bengaliName,
      stand.id,
      stand.coordsDescription || stand.tagline || '',
      true,
      stand.coordinates
    );
  }

  // 2. Add all start stops, destination stops, and intermediate stops from routes
  for (const route of routesData) {
    if (route.startStop) {
      addLocation(
        route.startStop.name,
        route.startStop.bengaliName,
        route.startStop.id,
        route.startStop.subtext || '',
        route.startStop.isStand,
        route.startStop.coordinates
      );
    }
    if (route.destinationStop) {
      addLocation(
        route.destinationStop.name,
        route.destinationStop.bengaliName,
        route.destinationStop.id,
        route.destinationStop.subtext || '',
        route.destinationStop.isStand,
        route.destinationStop.coordinates
      );
    }
    if (Array.isArray(route.stops)) {
      for (const stop of route.stops) {
        addLocation(
          stop.name,
          stop.bengaliName,
          stop.id,
          stop.subtext || '',
          stop.isStand,
          stop.coordinates
        );
      }
    }
  }

  return Array.from(seen.values());
}

// Build the index once at module load
let _locationIndex = null;
function getLocationIndex() {
  if (!_locationIndex) {
    _locationIndex = buildLocationIndex();
  }
  return _locationIndex;
}

/**
 * Mock Service Adapter for AutoPath Frontend.
 * 
 * Provides mock implementations for all transit queries while the backend
 * repository is being developed. Returns exact data shapes matching expected API contracts:
 * - route ID
 * - start stop
 * - destination stop
 * - ordered intermediate stops
 * - complete ordered path geometry as coordinates along the actual road network
 */
export const mockTransitService = {
  /**
   * Retrieves all registered auto stands with their map coordinates.
   */
  async getStands() {
    await delay(150);
    return {
      success: true,
      count: autoStands.length,
      data: autoStands
    };
  },

  /**
   * Retrieves details for a specific auto stand by ID.
   */
  async getStandById(standId) {
    await delay(120);
    const stand = autoStands.find(
      (s) => s.id.toLowerCase() === String(standId).toLowerCase()
    );
    if (!stand) {
      return {
        success: false,
        error: `Auto stand with ID '${standId}' not found in registry.`
      };
    }
    return {
      success: true,
      data: stand
    };
  },

  /**
   * Searches locations from the route database by query string.
   * Searches across auto stands, start/destination stops, and intermediate stops.
   * Supports case-insensitive partial and prefix matching.
   */
  async searchLocations(query = '') {
    await delay(150);
    const allLocations = getLocationIndex();
    const q = query.trim().toLowerCase();

    if (!q) {
      // Return stands first when no query is provided
      const standsFirst = allLocations
        .filter(loc => loc.isStand)
        .slice(0, 8);
      return {
        success: true,
        count: standsFirst.length,
        data: standsFirst
      };
    }

    const matches = allLocations.filter((loc) =>
      loc.name.toLowerCase().includes(q) ||
      (loc.bengaliName && loc.bengaliName.includes(q)) ||
      (loc.description && loc.description.toLowerCase().includes(q))
    );

    return {
      success: true,
      count: matches.length,
      data: matches
    };
  },

  /**
   * Finds auto routes between two locations.
   * Returns matching routes with their startStop, destinationStop, stops, and road geometry.
   * Supports both forward and reverse directions for bidirectional corridors.
   */
  async findRoutes(from = '', to = '', options = {}) {
    await delay(220);
    const fromStr = from.trim().toLowerCase();
    const toStr = to.trim().toLowerCase();

    // Include base routes
    const allCandidateRoutes = [...routesData];

    // Add reverse routes for bidirectional corridors
    routesData.forEach((r) => {
      const isBidi = r.direction === 'bidirectional' || r.is_bidirectional !== false || r.name?.includes('⇄');
      if (isBidi) {
        allCandidateRoutes.push(createReverseRoute(r));
      }
    });

    let matching = allCandidateRoutes;

    if (fromStr || toStr) {
      matching = allCandidateRoutes.filter((r) => {
        const originName = (r.originStandName || r.name || '').toLowerCase();
        const destName = (r.destinationStandName || r.name || '').toLowerCase();
        const bengaliName = r.bengaliName || '';

        const matchesOrigin = !fromStr || originName.includes(fromStr) || bengaliName.includes(fromStr) ||
          r.stops?.some(s => s.name?.toLowerCase().includes(fromStr) || s.bengaliName?.includes(fromStr));
        const matchesDest = !toStr || destName.includes(toStr) || bengaliName.includes(toStr) ||
          r.stops?.some(s => s.name?.toLowerCase().includes(toStr) || s.bengaliName?.includes(toStr));
        return matchesOrigin && matchesDest;
      });
    }

    return {
      success: true,
      count: matching.length,
      data: matching,
      query: { from, to, options }
    };
  },

  /**
   * Retrieves all routes departing from a specific auto stand.
   * Supports both forward departing routes and reverse departing routes
   * for bidirectional corridors.
   */
  async getRoutesByStand(standId) {
    await delay(160);
    const targetId = String(standId).toLowerCase();

    // 1. Direct routes originating from this stand
    const directRoutes = routesData.filter(
      (r) => r.originStandId && r.originStandId.toLowerCase() === targetId
    );

    // 2. Reverse routes for bidirectional corridors terminating at this stand
    const reverseRoutes = routesData
      .filter((r) => {
        const isBidi = r.direction === 'bidirectional' || r.is_bidirectional !== false || r.name?.includes('⇄');
        return isBidi && r.destinationStandId && r.destinationStandId.toLowerCase() === targetId &&
          (!r.originStandId || r.originStandId.toLowerCase() !== targetId);
      })
      .map(createReverseRoute);

    const allRoutes = [...directRoutes, ...reverseRoutes];
    return {
      success: true,
      count: allRoutes.length,
      data: allRoutes
    };
  },

  /**
   * Retrieves full details for a specific route including:
   * - route ID
   * - start stop
   * - destination stop
   * - ordered intermediate stops
   * - complete ordered path coordinates along the actual road network
   */
  async getRouteDetail(routeId) {
    await delay(140);
    const idStr = String(routeId).toLowerCase();

    let route = routesData.find(
      (r) => r.id.toLowerCase() === idStr
    );

    // Handle reverse route request
    if (!route && idStr.endsWith('-reverse')) {
      const baseId = idStr.replace(/-reverse$/, '');
      const baseRoute = routesData.find((r) => r.id.toLowerCase() === baseId);
      if (baseRoute) {
        route = createReverseRoute(baseRoute);
      }
    }

    if (!route) {
      return {
        success: false,
        error: `Route with ID '${routeId}' not found in backend database.`
      };
    }
    return {
      success: true,
      data: route
    };
  },

  /**
   * Retrieves ordered intermediate stops for a specific route.
   */
  async getRouteStops(routeId) {
    await delay(120);
    const route = routesData.find(
      (r) => r.id.toLowerCase() === String(routeId).toLowerCase()
    );
    if (!route) {
      return {
        success: false,
        error: `Route with ID '${routeId}' not found.`
      };
    }
    return {
      success: true,
      count: route.stops ? route.stops.length : 0,
      data: route.stops || []
    };
  }
};
