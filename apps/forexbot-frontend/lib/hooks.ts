import { useState, useEffect, useCallback } from 'react';
import { marketplaceApi, kycApi } from './api';

export function useMarketplaceBots(params?: { search?: string; mtPlatform?: string; sortBy?: string }) {
  const [data, setData] = useState<{ data: unknown[]; total: number; page: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useKycStatus() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kycApi.getStatus()
      .then(res => setStatus(res.data.status))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  return { status, loading };
}

export function useAuth() {
  const [user, setUser] = useState<{ sub: string; email: string; roles: string[] } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);
    } catch {}
  }, []);

  return { user, isLoggedIn: !!user };
}