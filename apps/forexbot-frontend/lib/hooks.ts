import { useState, useEffect, useCallback } from 'react';
import { marketplaceApi, kycApi, api } from './api';

export function useMarketplaceBots(params?: {
  search?: string;
  mtPlatform?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}) {
  const [data, setData] = useState<{
    data: unknown[];
    total: number;
    page: number;
    limit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const paramsKey = JSON.stringify(params);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await marketplaceApi.listBots(params);
      setData(res.data);
    } catch {
      setError('Failed to load bots');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useKycStatus() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kycApi
      .getStatus()
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  return { status, loading };
}

// FIX: useAuth no longer reads from localStorage (XSS risk).
// Instead it calls GET /auth/me — a lightweight endpoint that reads the httpOnly cookie.
// The cookie is validated server-side and returns the user payload if valid.
// If the backend /auth/me endpoint doesn't exist yet, this gracefully returns null.
export function useAuth() {
  const [user, setUser] = useState<{
    sub: string;
    email: string;
    roles: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, isLoggedIn: !!user, loading };
}
