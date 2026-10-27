/**
 * API Configuration for AutoPath Frontend
 * 
 * Configures the backend API base URL and development mock adapter.
 * The frontend and backend are housed in separate repositories.
 * 
 * Switch VITE_USE_MOCK_DATA to 'false' in .env once your backend server is running.
 */

export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const USE_MOCK_DATA = 
  import.meta.env.VITE_USE_MOCK_DATA !== 'false';

export const API_TIMEOUT_MS = 
  Number(import.meta.env.VITE_API_TIMEOUT_MS) || 8000;

/**
 * Configurable API endpoints.
 * Backend developers can adapt their routes to match these contracts.
 */
export const ENDPOINTS = {
  // Auto stands endpoints
  stands: '/stands',
  standDetail: (id) => `/stands/${encodeURIComponent(id)}`,
  standRoutes: (id) => `/stands/${encodeURIComponent(id)}/routes`,

  // Route searching & corridors endpoints
  searchLocations: '/locations/search',
  findRoutes: '/routes/search',
  routeDetail: (id) => `/routes/${encodeURIComponent(id)}`,
  routeStops: (id) => `/routes/${encodeURIComponent(id)}/stops`
};
