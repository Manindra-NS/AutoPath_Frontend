import { autoStands } from '../data/standsData';
import { routesData } from '../data/routesData';
import { popularStandSuggestions } from '../data/searchSuggestions';

/**
 * Helper to simulate realistic network delay during frontend development.
 */
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

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
   * Searches locations and auto stands by query string.
   */
  async searchLocations(query = '') {
    await delay(150);
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        success: true,
        count: popularStandSuggestions.length,
        data: popularStandSuggestions
      };
    }

    const matches = popularStandSuggestions.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.bengaliName.includes(q) ||
        item.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    });

    return {
      success: true,
      count: matches.length,
      data: matches
    };
  },

  /**
   * Finds auto routes between two locations.
   * Returns matching routes with their startStop, destinationStop, stops, and road geometry.
   */
  async findRoutes(from = '', to = '', options = {}) {
    await delay(220);
    const fromStr = from.trim().toLowerCase();
    const toStr = to.trim().toLowerCase();

    let matching = routesData;

    if (fromStr || toStr) {
      matching = routesData.filter((r) => {
        const originName = r.name.toLowerCase();
        const bengaliName = r.bengaliName;
        const matchesOrigin = !fromStr || originName.includes(fromStr) || bengaliName.includes(fromStr);
        const matchesDest = !toStr || originName.includes(toStr) || bengaliName.includes(toStr) ||
          r.stops?.some(s => s.name.toLowerCase().includes(toStr) || s.bengaliName.includes(toStr));
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
   */
  async getRoutesByStand(standId) {
    await delay(160);
    const routes = routesData.filter(
      (r) => r.originStandId.toLowerCase() === String(standId).toLowerCase()
    );
    return {
      success: true,
      count: routes.length,
      data: routes
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
    const route = routesData.find(
      (r) => r.id.toLowerCase() === String(routeId).toLowerCase()
    );
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
