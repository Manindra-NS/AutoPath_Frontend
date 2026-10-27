import { USE_MOCK_DATA, ENDPOINTS } from './apiConfig';
import { apiClient } from './apiClient';
import { mockTransitService } from './mockTransitService';
import { normalizeRouteData, normalizeStop } from './routeNormalizer';

/**
 * Unified Transit Service Layer
 * 
 * Provides an abstraction for all transit operations.
 * - When VITE_USE_MOCK_DATA is 'true' (or by default in development), delegates to the mock adapter.
 * - When VITE_USE_MOCK_DATA is 'false', issues HTTP requests to the live backend.
 * - In live mode, failures are reported honestly and never silently replaced with fabricated mock data.
 * - Data normalization and coordinate conversion are handled here to keep presentation components pure.
 */
export const transitService = {
  /**
   * Check whether the app is currently in mock mode or live API mode.
   */
  isMockMode() {
    return USE_MOCK_DATA;
  },

  /**
   * Retrieves all auto stands and their map coordinates.
   * Backend endpoint: GET /api/stands
   */
  async getStands() {
    if (USE_MOCK_DATA) {
      return mockTransitService.getStands();
    }

    try {
      const response = await apiClient.get(ENDPOINTS.stands);
      const rawList = response.data || response;
      return {
        success: true,
        data: Array.isArray(rawList) ? rawList : [],
        count: Array.isArray(rawList) ? rawList.length : 0
      };
    } catch (err) {
      console.error('[transitService] getStands failed against live backend:', err);
      return {
        success: false,
        error: err.message,
        status: err.status || 500
      };
    }
  },

  /**
   * Retrieves a specific auto stand by ID.
   * Backend endpoint: GET /api/stands/:id
   */
  async getStandById(standId) {
    if (USE_MOCK_DATA) {
      return mockTransitService.getStandById(standId);
    }

    try {
      const response = await apiClient.get(ENDPOINTS.standDetail(standId));
      return {
        success: true,
        data: response.data || response
      };
    } catch (err) {
      console.error(`[transitService] getStandById(${standId}) failed:`, err);
      return {
        success: false,
        error: err.message,
        status: err.status || 500
      };
    }
  },

  /**
   * Searches locations and auto stands for autocompletion.
   * Backend endpoint: GET /api/locations/search?q=query
   */
  async searchLocations(query = '') {
    if (USE_MOCK_DATA) {
      return mockTransitService.searchLocations(query);
    }

    try {
      const response = await apiClient.get(ENDPOINTS.searchLocations, { q: query });
      const rawList = response.data || response;
      return {
        success: true,
        data: Array.isArray(rawList) ? rawList : [],
        count: Array.isArray(rawList) ? rawList.length : 0
      };
    } catch (err) {
      console.error(`[transitService] searchLocations('${query}') failed:`, err);
      return {
        success: false,
        error: err.message,
        status: err.status || 500
      };
    }
  },

  /**
   * Finds auto routes between two locations.
   * Backend endpoint: GET /api/routes/search?from=...&to=...
   * Returns normalized routes with road network coordinates and ordered stops.
   */
  async findRoutes(from = '', to = '', options = {}) {
    if (USE_MOCK_DATA) {
      const res = await mockTransitService.findRoutes(from, to, options);
      if (res.success && Array.isArray(res.data)) {
        return {
          ...res,
          data: res.data.map(normalizeRouteData)
        };
      }
      return res;
    }

    try {
      const params = { from, to, ...options };
      const response = await apiClient.get(ENDPOINTS.findRoutes, params);
      const rawList = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
      const normalizedRoutes = rawList.map(normalizeRouteData);

      return {
        success: true,
        data: normalizedRoutes,
        count: normalizedRoutes.length,
        query: { from, to, options }
      };
    } catch (err) {
      console.error(`[transitService] findRoutes('${from}', '${to}') failed:`, err);
      return {
        success: false,
        error: err.message,
        status: err.status || 500
      };
    }
  },

  /**
   * Retrieves all routes available from a particular auto stand.
   * Backend endpoint: GET /api/stands/:id/routes
   */
  async getRoutesByStand(standId) {
    if (USE_MOCK_DATA) {
      const res = await mockTransitService.getRoutesByStand(standId);
      if (res.success && Array.isArray(res.data)) {
        return {
          ...res,
          data: res.data.map(normalizeRouteData)
        };
      }
      return res;
    }

    try {
      const response = await apiClient.get(ENDPOINTS.standRoutes(standId));
      const rawList = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
      const normalizedRoutes = rawList.map(normalizeRouteData);

      return {
        success: true,
        data: normalizedRoutes,
        count: normalizedRoutes.length
      };
    } catch (err) {
      console.error(`[transitService] getRoutesByStand('${standId}') failed:`, err);
      return {
        success: false,
        error: err.message,
        status: err.status || 500
      };
    }
  },

  /**
   * Retrieves complete route details and road-following geometry for a specific route.
   * Backend endpoint: GET /api/routes/:id
   * 
   * Returns:
   * - route ID
   * - start stop
   * - destination stop
   * - ordered intermediate stops
   * - complete ordered path coordinates along the actual road network
   */
  async getRouteDetail(routeId) {
    if (USE_MOCK_DATA) {
      const res = await mockTransitService.getRouteDetail(routeId);
      if (res.success && res.data) {
        return {
          success: true,
          data: normalizeRouteData(res.data)
        };
      }
      return res;
    }

    try {
      const response = await apiClient.get(ENDPOINTS.routeDetail(routeId));
      const rawRoute = response.data || response;
      if (!rawRoute || typeof rawRoute !== 'object') {
        throw new Error(`Route payload for '${routeId}' is invalid or empty.`);
      }

      const normalized = normalizeRouteData(rawRoute);
      return {
        success: true,
        data: normalized
      };
    } catch (err) {
      console.error(`[transitService] getRouteDetail('${routeId}') failed:`, err);
      return {
        success: false,
        error: err.message,
        status: err.status || 500
      };
    }
  },

  /**
   * Retrieves ordered intermediate stops for a specific route.
   * Backend endpoint: GET /api/routes/:id/stops
   */
  async getRouteStops(routeId) {
    if (USE_MOCK_DATA) {
      const res = await mockTransitService.getRouteStops(routeId);
      if (res.success && Array.isArray(res.data)) {
        return {
          ...res,
          data: res.data.map((s, idx) => normalizeStop(s, idx + 1))
        };
      }
      return res;
    }

    try {
      const response = await apiClient.get(ENDPOINTS.routeStops(routeId));
      const rawList = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
      const normalized = rawList.map((s, idx) => normalizeStop(s, idx + 1));

      return {
        success: true,
        data: normalized,
        count: normalized.length
      };
    } catch (err) {
      console.error(`[transitService] getRouteStops('${routeId}') failed:`, err);
      return {
        success: false,
        error: err.message,
        status: err.status || 500
      };
    }
  }
};
