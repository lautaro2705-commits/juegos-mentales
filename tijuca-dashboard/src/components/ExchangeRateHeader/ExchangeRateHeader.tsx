// ============================================================
// Tijuca Travel - Exchange Rate Header
// "Cotización del Día (MEP + 15%)" with trend indicator
// ============================================================

import React from 'react';
import type { ExchangeRateHeaderProps } from '../../types/vendor-dashboard';
import styles from './ExchangeRateHeader.module.css';

export const ExchangeRateHeader: React.FC<ExchangeRateHeaderProps> = ({
  rate,
  loading,
}) => {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  const trendClass =
    rate.direction === 'up'
      ? styles.up
      : rate.direction === 'down'
        ? styles.down
        : styles.stable;

  const trendIcon =
    rate.direction === 'up' ? '▲' : rate.direction === 'down' ? '▼' : '—';

  const sign = rate.percentChange > 0 ? '+' : '';

  return (
    <div className={styles.container}>
      <div className={styles.label}>
        Cotización del Día (MEP + {rate.markup}%)
      </div>
      <div className={styles.rateRow}>
        <span className={styles.amount}>
          ${rate.current.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
        </span>
        <span className={`${styles.trend} ${trendClass}`}>
          <span className={styles.trendIcon}>{trendIcon}</span>
          <span className={styles.trendPct}>
            {sign}{rate.percentChange.toFixed(2)}%
          </span>
          <span className={styles.trendLabel}>vs. ayer</span>
        </span>
      </div>
      <div className={styles.updated}>
        Actualizado: {new Date(rate.updatedAt).toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
};
