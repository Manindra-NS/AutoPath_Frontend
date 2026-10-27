import { API_BASE_URL, API_TIMEOUT_MS } from './apiConfig';

/**
 * Custom Error class for HTTP responses from the backend.
 */
export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Centralized API client for communicating with the external AutoPath backend.
 * Features:
 * - Configurable base URL
 * - Request timeouts via AbortSignal
 * - Standardized JSON parsing
 * - Descriptive error normalization (Never fabricates mock data on failure)
 */
class ApiClient {
  constructor(baseUrl = API_BASE_URL, timeoutMs = API_TIMEOUT_MS) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  /**
   * Performs an HTTP request with timeout and error handling.
   * @param {string} endpoint - Relative path (e.g. '/stands')
   * @param {object} options - Fetch options (method, headers, body, params)
   */
  async request(endpoint, options = {}) {
    const { params, headers = {}, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Append URL query parameters if provided
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let responseData = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json().catch(() => null);
      } else {
        responseData = await response.text().catch(() => null);
      }

      if (!response.ok) {
        const errorMsg = 
          responseData?.message || 
          responseData?.error || 
          `Backend returned HTTP ${response.status} (${response.statusText})`;
        throw new ApiError(errorMsg, response.status, responseData);
      }

      return responseData;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new ApiError(
          `Request to backend timed out after ${this.timeoutMs / 1000} seconds. Please check if the backend server is running at ${this.baseUrl}.`,
          408
        );
      }

      if (err instanceof ApiError) {
        throw err;
      }

      // General network failure (e.g. CORS error, connection refused, offline)
      throw new ApiError(
        `Unable to connect to AutoPath backend at ${this.baseUrl}. Ensure your backend server is started and CORS is configured. Details: ${err.message}`,
        0
      );
    }
  }

  get(endpoint, params = {}, headers = {}) {
    return this.request(endpoint, { method: 'GET', params, headers });
  }

  post(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body), headers });
  }
}

export const apiClient = new ApiClient();
