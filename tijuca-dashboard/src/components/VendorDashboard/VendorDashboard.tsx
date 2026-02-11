// ============================================================
// Tijuca Travel - Vendor Dashboard ("Cockpit")
// Main layout: assembles all sub-components
// ============================================================

import React, { useCallback } from 'react';
import { useVendorDashboard } from '../../hooks/useVendorDashboard';
import { ExchangeRateHeader } from '../ExchangeRateHeader/ExchangeRateHeader';
import { KpiCards } from '../KpiCards/KpiCards';
import { NotificationCenter } from '../NotificationCenter/NotificationCenter';
import { QuickActions } from '../QuickActions/QuickActions';
import styles from './VendorDashboard.module.css';

// Replace with your actual navigation/routing logic
const navigate = (path: string) => {
  window.location.href = path;
};

export const VendorDashboard: React.FC = () => {
  const {
    data,
    loading,
    error,
    refresh,
    dismissNotification,
    activeNotifications,
  } = useVendorDashboard();

  const handleNewFile = useCallback(() => navigate('/files/new'), []);
  const handleQuickPayment = useCallback(() => navigate('/payments/new'), []);
  const handleSearchPassenger = useCallback(
    () => navigate('/passengers/search'),
    []
  );

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCard}>
          <h2>Error al cargar el dashboard</h2>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={refresh}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mi Cockpit</h1>
          <p className={styles.pageSubtitle}>
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={refresh}
          title="Actualizar datos"
          aria-label="Actualizar datos"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M1 4v6h6M23 20v-6h-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* A. Exchange Rate — top, most visible */}
      <ExchangeRateHeader
        rate={data?.exchangeRate ?? {
          current: 0,
          previous: 0,
          percentChange: 0,
          direction: 'stable',
          updatedAt: new Date().toISOString(),
          markup: 15,
        }}
        loading={loading}
      />

      {/* D. Quick Actions — immediately accessible */}
      <QuickActions
        onNewFile={handleNewFile}
        onQuickPayment={handleQuickPayment}
        onSearchPassenger={handleSearchPassenger}
      />

      {/* B. KPI Cards */}
      <KpiCards
        kpis={data?.kpis ?? {
          monthlySalesUsd: 0,
          activeFiles: 0,
          goal: null,
        }}
        loading={loading}
      />

      {/* C. Notification Center — the core */}
      <NotificationCenter
        notifications={activeNotifications}
        onDismiss={dismissNotification}
        loading={loading}
      />
    </div>
  );
};

export default VendorDashboard;
