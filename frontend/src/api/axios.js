
import axios from 'axios';

// =========================================
// API BASE URL
// =========================================

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000'
).replace(/\/+$/, '');

// =========================================
// AXIOS INSTANCE
// =========================================

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// =========================================
// PUBLIC AUTHENTICATION ENDPOINTS
// =========================================

const PUBLIC_AUTH_ENDPOINTS = [
  // Citizen authentication
  '/auth/citizen/login/',
  '/auth/login/',
  '/auth/register/',

  // Department Manager authentication
  '/auth/civic/department/register/',
  '/auth/civic/department/login/',

  // Department Staff authentication
  '/auth/civic/staff/login/',

  // Senior Citizen Manager authentication
  '/auth/senior-citizen/manager/login/',
  '/auth/senior-citizen/manager/register/',


  // Senior Citizen Staff authentication
  '/auth/senior-citizen/staff/login/',


  // Email verification
  '/auth/verify-email/',

  // Google authentication
  '/auth/google/exchange/',

  // Token refresh
  '/auth/token/refresh/',
];

// =========================================
// REQUEST INTERCEPTOR
// =========================================

api.interceptors.request.use(
  (config) => {
    const requestUrl = config.url || "";

    const isPublicAuthRequest =
      PUBLIC_AUTH_ENDPOINTS.some((endpoint) =>
        requestUrl.includes(endpoint)
      );

    if (isPublicAuthRequest) {
      // Remove Authorization header from public login requests.
      delete config.headers.Authorization;
      delete config.headers.authorization;
    } else {
      const accessToken = localStorage.getItem(
        "civicfix_access_token"
      );

      if (
        accessToken &&
        accessToken !== "null" &&
        accessToken !== "undefined"
      ) {
        config.headers.Authorization =
          `Bearer ${accessToken}`;
      } else {
        delete config.headers.Authorization;
        delete config.headers.authorization;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =========================================
// API BASE URL HELPER
// =========================================

export function getApiBaseUrl() {
  return API_BASE_URL;
}

// =========================================
// API ERROR MESSAGE HANDLER
// =========================================

export function getApiErrorMessage(error) {
  if (error.response) {
    const data = error.response.data;

    // Backend error
    if (typeof data?.error === 'string') {
      return data.error;
    }

    // DRF detail error
    if (typeof data?.detail === 'string') {
      return data.detail;
    }

    // General message
    if (typeof data?.message === 'string') {
      return data.message;
    }

    // Field validation errors
    if (data && typeof data === 'object') {
      const messages = Object.entries(data)
        .map(([field, value]) => {
          const message = Array.isArray(value)
            ? value.join(' ')
            : typeof value === 'string'
              ? value
              : '';

          return message ? `${field}: ${message}` : '';
        })
        .filter(Boolean);

      if (messages.length) {
        return messages.join(' ');
      }
    }

    return `Request failed with status ${error.response.status}.`;
  }

  // Network error
  if (error.request) {
    return (
      'Unable to connect to CivicFix. ' +
      'Check the backend connection and try again.'
    );
  }

  return error.message || 'An unexpected error occurred.';
}

// =========================================
// DEFAULT EXPORT
// =========================================

export default api;
