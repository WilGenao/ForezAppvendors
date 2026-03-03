import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
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

// Auth
export const authApi = {
  register: (email: string, password: string) => api.post('/auth/register', { email, password }),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

// Marketplace
export const marketplaceApi = {
  listBots: (params?: { search?: string; mtPlatform?: string; page?: number; limit?: number; sortBy?: string }) =>
    api.get('/marketplace/bots', { params }),
  getBot: (slug: string) => api.get(`/marketplace/bots/${slug}`),
};

// KYC
export const kycApi = {
  getStatus: () => api.get('/kyc/status'),
  submit: (data: { documentType: string; documentFrontUrl: string; documentBackUrl?: string; selfieUrl: string }) =>
    api.post('/kyc/submit', data),
};

// Licensing
export const licensingApi = {
  validate: (data: { licenseKey: string; mtPlatform: string; mtAccountId: string }) =>
    api.post('/licensing/validate', data),
};

// Reviews
export const reviewsApi = {
  getForBot: (botId: string) => api.get(`/reviews/bot/${botId}`),
  create: (data: { botId: string; rating: number; comment: string }) => api.post('/reviews', data),
};

// Payments
export const paymentsApi = {
  createCheckout: (data: { botId: string; listingId: string }) => api.post('/payments/checkout', data),
};