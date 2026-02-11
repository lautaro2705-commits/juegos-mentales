// ============================================================
// Tijuca Travel - Notification Center
// "Semáforo de Prioridades" — Urgent / Attention / Followup
// ============================================================

import React, { useState } from 'react';
import type {
  NotificationCenterProps,
  DashboardNotification,
  NotificationPriority,
} from '../../types/vendor-dashboard';
import styles from './NotificationCenter.module.css';

const PRIORITY_CONFIG: Record<
  NotificationPriority,
  { label: string; emoji: string; className: string }
> = {
  urgent: { label: 'Urgente', emoji: '\uD83D\uDD34', className: 'urgent' },
  attention: { label: 'Atención', emoji: '\uD83D\uDFE1', className: 'attention' },
  followup: { label: 'Seguimiento', emoji: '\uD83D\uDFE2', className: 'followup' },
};

const FILTER_OPTIONS: { value: 'all' | NotificationPriority; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'urgent', label: 'Urgentes' },
  { value: 'attention', label: 'Atención' },
  { value: 'followup', label: 'Seguimiento' },
];

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onDismiss,
  loading,
}) => {
  const [filter, setFilter] = useState<'all' | NotificationPriority>('all');

  const filtered =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.priority === filter);

  const counts = {
    urgent: notifications.filter((n) => n.priority === 'urgent').length,
    attention: notifications.filter((n) => n.priority === 'attention').length,
    followup: notifications.filter((n) => n.priority === 'followup').length,
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Centro de Notificaciones</h2>
        </div>
        <div className={styles.skeletonList}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with counts */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          Centro de Notificaciones
          {notifications.length > 0 && (
            <span className={styles.totalBadge}>{notifications.length}</span>
          )}
        </h2>
        <div className={styles.counters}>
          {counts.urgent > 0 && (
            <span className={`${styles.counter} ${styles.counterUrgent}`}>
              {counts.urgent} urgente{counts.urgent !== 1 ? 's' : ''}
            </span>
          )}
          {counts.attention > 0 && (
            <span className={`${styles.counter} ${styles.counterAttention}`}>
              {counts.attention} atención
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className={styles.filters}>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.filterBtn} ${
              filter === opt.value ? styles.filterActive : ''
            }`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>&#10003;</span>
            <p>No hay notificaciones pendientes</p>
          </div>
        ) : (
          filtered.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onDismiss={onDismiss}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ---- Individual Notification Card ----
const NotificationItem: React.FC<{
  notification: DashboardNotification;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  const config = PRIORITY_CONFIG[notification.priority];
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = () => {
    setDismissing(true);
    // Small delay for animation
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <div
      className={`${styles.item} ${styles[config.className]} ${
        dismissing ? styles.itemDismissing : ''
      }`}
    >
      <div className={styles.itemPriority}>
        <span className={styles.priorityDot} aria-label={config.label} />
      </div>

      <div className={styles.itemContent}>
        <div className={styles.itemMessage}>{notification.message}</div>
        <div className={styles.itemDetail}>{notification.detail}</div>
        {notification.fileId && (
          <span className={styles.fileTag}>File #{notification.fileId}</span>
        )}
      </div>

      <div className={styles.itemActions}>
        {notification.actionUrl && (
          <a
            href={notification.actionUrl}
            className={styles.actionLink}
          >
            {notification.actionLabel ?? 'Ver'}
          </a>
        )}
        <button
          className={styles.dismissBtn}
          onClick={handleDismiss}
          title="Marcar como resuelto"
          aria-label="Marcar como resuelto"
        >
          &#10003;
        </button>
      </div>
    </div>
  );
};
