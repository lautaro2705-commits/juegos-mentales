// ============================================================
// Tijuca Travel - Quick Actions
// Large action buttons: New File, Quick Payment, Search
// ============================================================

import React from 'react';
import type { QuickActionsProps } from '../../types/vendor-dashboard';
import styles from './QuickActions.module.css';

export const QuickActions: React.FC<QuickActionsProps> = ({
  onNewFile,
  onQuickPayment,
  onSearchPassenger,
}) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Acceso Rápido</h3>
      <div className={styles.grid}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNewFile}>
          <span className={styles.btnIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className={styles.btnLabel}>Nuevo File</span>
        </button>

        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onQuickPayment}>
          <span className={styles.btnIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className={styles.btnLabel}>Cargar Cobro Rápido</span>
        </button>

        <button className={`${styles.btn} ${styles.btnTertiary}`} onClick={onSearchPassenger}>
          <span className={styles.btnIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className={styles.btnLabel}>Buscar Pasajero</span>
        </button>
      </div>
    </div>
  );
};
