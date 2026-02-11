// ============================================================
// Tijuca Travel - useVendorDashboard Hook
// Fetches and manages all vendor dashboard state
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import type {
  VendorDashboardData,
  DashboardNotification,
} from '../types/vendor-dashboard';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface UseVendorDashboardReturn {
  data: VendorDashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  dismissNotification: (id: string) => void;
  activeNotifications: DashboardNotification[];
}

export function useVendorDashboard(): UseVendorDashboardReturn {
  const [data, setData] = useState<VendorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/vendor/dashboard', {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? 'Sesión expirada. Iniciá sesión nuevamente.'
            : 'Error al cargar el dashboard'
        );
      }

      const json = await res.json();

      if (!json.ok) throw new Error(json.error ?? 'Error desconocido');

      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Dismiss a notification (optimistic UI + API call)
  const handleDismiss = useCallback(async (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));

    try {
      await fetch(`/api/vendor/notifications/${encodeURIComponent(id)}/dismiss`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // If API fails, keep it dismissed in UI — not critical
    }
  }, []);

  // Filter dismissed notifications
  const activeNotifications = (data?.notifications ?? []).filter(
    (n) => !dismissedIds.has(n.id)
  );

  return {
    data,
    loading,
    error,
    refresh: fetchDashboard,
    dismissNotification: handleDismiss,
    activeNotifications,
  };
}
