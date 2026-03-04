// apps/forexbot-frontend/lib/api.ts
import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const refresh = localStorage.getItem('refreshToken');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh });
          localStorage.setItem('accessToken', data.accessToken);
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${data.accessToken}`;
            return api.request(error.config);
          }
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string) => api.post('/auth/register', { email, password }),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
};

// ─── Marketplace ─────────────────────────────────────────────────────────────
export const marketplaceApi = {
  listBots: (params?: {
    search?: string; mtPlatform?: string; page?: number;
    limit?: number; sortBy?: string; categoryId?: string;
  }) => api.get('/marketplace/bots', { params }),
  getBot: (slug: string) => api.get(`/marketplace/bots/${slug}`),
  createBot: (data: {
    name: string; shortDescription: string; description?: string;
    mtPlatform: string; currencyPairs: string[]; timeframes: string[]; riskLevel?: number;
  }) => api.post('/marketplace/bots', data),
};

// ─── KYC ─────────────────────────────────────────────────────────────────────
export const kycApi = {
  getStatus: () => api.get('/kyc/status'),
  submit: (data: {
    documentType: string; documentFrontUrl: string;
    documentBackUrl?: string; selfieUrl: string;
  }) => api.post('/kyc/submit', data),
};

// ─── Subscriptions ───────────────────────────────────────────────────────────
export const subscriptionsApi = {
  getAll: () => api.get('/subscriptions'),
  cancel: (id: string) => api.post(`/subscriptions/${id}/cancel`),
  reactivate: (id: string) => api.post(`/subscriptions/${id}/reactivate`),
  getBillingPortal: () => api.get('/subscriptions/billing-portal'),
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentsApi = {
  createCheckout: (botListingId: string, listingType: string) =>
    api.post('/payments/checkout', { botListingId, listingType }),
};

// ─── Reviews ─────────────────────────────────────────────────────────────────
export const reviewsApi = {
  getForBot: (botId: string, page = 1, limit = 10) =>
    api.get(`/reviews/bot/${botId}?page=${page}&limit=${limit}`),
  create: (data: { botId: string; rating: number; title?: string; body: string }) =>
    api.post('/reviews', data),
};

// ─── Licensing ───────────────────────────────────────────────────────────────
export const licensingApi = {
  validate: (data: { licenseKey: string; mtPlatform: string; mtAccountId: string }) =>
    api.post('/licensing/validate', data),
};

// ─── Seller ──────────────────────────────────────────────────────────────────
export const sellerApi = {
  getDashboard: () => api.get('/seller/dashboard'),
  getRecentSales: (page = 1, limit = 20) => api.get(`/seller/sales?page=${page}&limit=${limit}`),
  getStripeOnboardingUrl: () => api.post('/seller/stripe/onboarding'),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getKycQueue: (page = 1) => api.get(`/admin/kyc?page=${page}`),
  approveKyc: (id: string) => api.post(`/admin/kyc/${id}/approve`),
  rejectKyc: (id: string, reason: string) => api.post(`/admin/kyc/${id}/reject`, { reason }),
  getBots: (status?: string, page = 1) => api.get(`/admin/bots?status=${status ?? ''}&page=${page}`),
  approveBot: (id: string) => api.patch(`/admin/bots/${id}/approve`),
  suspendBot: (id: string, reason?: string) => api.patch(`/admin/bots/${id}/suspend`, { reason }),
  rejectBot: (id: string, reason?: string) => api.patch(`/admin/bots/${id}/reject`, { reason }),
  getUsers: (search?: string, page = 1) => api.get(`/admin/users?search=${search ?? ''}&page=${page}`),
  suspendUser: (id: string) => api.patch(`/admin/users/${id}/suspend`),
  activateUser: (id: string) => api.patch(`/admin/users/${id}/activate`),
};
