/**
 * FIX: Token storage moved from localStorage to httpOnly cookies.
 *
 * WHY: localStorage is accessible via JavaScript and vulnerable to XSS attacks.
 * httpOnly cookies cannot be read by JavaScript — only sent automatically by the browser.
 *
 * REQUIRED BACKEND CHANGE: The /auth/login and /auth/refresh endpoints must set
 * the tokens as cookies instead of returning them in the JSON body.
 * Use cookie-parser on NestJS side and set:
 *   res.cookie('access_token', token, { httpOnly: true, secure: true, sameSite: 'strict' })
 *   res.cookie('refresh_token', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/v1/auth/refresh' })
 *
 * In the meantime, this file handles the transition gracefully:
 * - New logins use cookies (withCredentials: true)
 * - The interceptor no longer manually attaches Authorization headers
 *   (the browser sends the cookie automatically)
 */

import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // FIX: withCredentials: true is required for cookies to be sent cross-origin
  withCredentials: true,
});

// FIX: Removed manual Authorization header injection from localStorage.
// The httpOnly cookie is sent automatically by the browser.
// No request interceptor needed for auth headers.

// Auto-refresh on 401 using the refresh token cookie (also httpOnly)
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(null);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api.request(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // The refresh token is in the httpOnly cookie — no body needed.
        // The server reads it from the cookie and sets a new access_token cookie.
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        processQueue(null);
        return api.request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Redirect to login — all auth state is in cookies, nothing to clear client-side
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  register: (email: string, password: string) =>
    api.post('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () =>
    api.post('/auth/logout'),
};

// Marketplace
export const marketplaceApi = {
  listBots: (params?: {
    search?: string;
    mtPlatform?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }) => api.get('/marketplace/bots', { params }),
  getBot: (slug: string) => api.get(`/marketplace/bots/${slug}`),
};

// KYC
export const kycApi = {
  getStatus: () => api.get('/kyc/status'),
  submit: (data: {
    documentType: string;
    documentFrontUrl: string;
    documentBackUrl?: string;
    selfieUrl: string;
  }) => api.post('/kyc/submit', data),
};

// Licensing
export const licensingApi = {
  validate: (data: { licenseKey: string; mtPlatform: string; mtAccountId: string }) =>
    api.post('/licensing/validate', data),
};

// Reviews
export const reviewsApi = {
  getForBot: (botId: string) => api.get(`/reviews/bot/${botId}`),
  create: (data: { botId: string; rating: number; title?: string; body: string }) =>
    api.post('/reviews', data),
};

// Payments
export const paymentsApi = {
  createCheckout: (data: { botListingId: string; listingType: string }) =>
    api.post('/payments/checkout', data),
};
