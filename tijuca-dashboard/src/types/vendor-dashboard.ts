// ============================================================
// Tijuca Travel - Vendor Dashboard Types
// ============================================================

// --- Exchange Rate ---
export interface ExchangeRate {
  current: number;
  previous: number;
  percentChange: number;
  direction: 'up' | 'down' | 'stable';
  updatedAt: string;
  markup: number; // e.g., 15 for MEP + 15%
}

// --- KPIs ---
export interface VendorKpis {
  monthlySalesUsd: number;
  activeFiles: number;
  goal: {
    target: number;
    current: number;
    percentage: number;
  } | null;
}

// --- Notifications ---
export type NotificationPriority = 'urgent' | 'attention' | 'followup';

export type NotificationType =
  | 'payment_due'
  | 'operator_payment_due'
  | 'passport_expiry'
  | 'trip_departure'
  | 'quote_followup'
  | 'document_pending'
  | 'general';

export interface DashboardNotification {
  id: string;
  priority: NotificationPriority;
  type: NotificationType;
  fileId: number | null;
  clientName: string;
  message: string;
  detail: string;
  dueDate: string;
  daysRemaining: number;
  dismissed: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

// --- API Responses ---
export interface VendorDashboardData {
  exchangeRate: ExchangeRate;
  kpis: VendorKpis;
  notifications: DashboardNotification[];
}

// --- Component Props ---
export interface ExchangeRateHeaderProps {
  rate: ExchangeRate;
  loading?: boolean;
}

export interface KpiCardsProps {
  kpis: VendorKpis;
  loading?: boolean;
}

export interface NotificationCenterProps {
  notifications: DashboardNotification[];
  onDismiss: (id: string) => void;
  loading?: boolean;
}

export interface QuickActionsProps {
  onNewFile: () => void;
  onQuickPayment: () => void;
  onSearchPassenger: () => void;
}
