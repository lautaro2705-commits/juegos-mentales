// ============================================================
// Tijuca Travel - KPI Cards
// Personal sales metrics: Monthly Sales, Active Files, Goal
// ============================================================

import React from 'react';
import type { KpiCardsProps } from '../../types/vendor-dashboard';
import styles from './KpiCards.module.css';

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, loading }) => {
  if (loading) {
    return (
      <div className={styles.grid}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.card}>
            <div className={styles.skeleton} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {/* Monthly Sales */}
      <div className={styles.card}>
        <div className={styles.cardIcon}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 1v18M6 5h5.5a3.5 3.5 0 010 7H6m0 0h6.5a3.5 3.5 0 010 7H6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={styles.cardLabel}>Ventas del Mes</div>
        <div className={styles.cardValue}>
          USD{' '}
          {kpis.monthlySalesUsd.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </div>
      </div>

      {/* Active Files */}
      <div className={styles.card}>
        <div className={`${styles.cardIcon} ${styles.iconBlue}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 7V5a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={styles.cardLabel}>Files Activos</div>
        <div className={styles.cardValue}>{kpis.activeFiles}</div>
      </div>

      {/* Goal Progress */}
      <div className={styles.card}>
        <div className={`${styles.cardIcon} ${styles.iconPurple}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="scale(0.83)"
            />
          </svg>
        </div>
        <div className={styles.cardLabel}>Objetivo Mensual</div>
        {kpis.goal ? (
          <>
            <div className={styles.cardValue}>{kpis.goal.percentage}%</div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${kpis.goal.percentage}%` }}
                role="progressbar"
                aria-valuenow={kpis.goal.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div className={styles.progressLabel}>
              USD {kpis.goal.current.toLocaleString('en-US')} /{' '}
              {kpis.goal.target.toLocaleString('en-US')}
            </div>
          </>
        ) : (
          <div className={styles.cardValueMuted}>Sin objetivo definido</div>
        )}
      </div>
    </div>
  );
};
