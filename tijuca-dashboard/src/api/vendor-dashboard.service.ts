// ============================================================
// Tijuca Travel - Vendor Dashboard Service
// Backend logic: notifications, KPIs, exchange rate
// ============================================================
// Assumes a SQL-based DB (Postgres/MySQL) accessed via an ORM
// like Prisma, Knex, or raw queries. Adjust to your stack.

import type {
  ExchangeRate,
  VendorKpis,
  DashboardNotification,
  NotificationPriority,
  NotificationType,
  VendorDashboardData,
} from '../types/vendor-dashboard';

// ---- Constants ----
const PASSPORT_EXPIRY_WARNING_MONTHS = 6;
const TRIP_DEPARTURE_WARNING_DAYS = 5;
const QUOTE_FOLLOWUP_HOURS = 48;
const MEP_MARKUP_PERCENT = 15;

// ---- Exchange Rate ----
export async function getExchangeRate(db: any): Promise<ExchangeRate> {
  // Fetch today's and yesterday's MEP rate from a rates table
  // or from an external API (e.g., DolarApi, Ambito)
  const rows = await db.query(`
    SELECT rate, recorded_at
    FROM exchange_rates
    WHERE type = 'MEP'
    ORDER BY recorded_at DESC
    LIMIT 2
  `);

  const today = rows[0]?.rate ?? 0;
  const yesterday = rows[1]?.rate ?? today;
  const withMarkup = today * (1 + MEP_MARKUP_PERCENT / 100);
  const prevWithMarkup = yesterday * (1 + MEP_MARKUP_PERCENT / 100);
  const diff = withMarkup - prevWithMarkup;
  const pct = prevWithMarkup > 0 ? (diff / prevWithMarkup) * 100 : 0;

  return {
    current: Math.round(withMarkup * 100) / 100,
    previous: Math.round(prevWithMarkup * 100) / 100,
    percentChange: Math.round(pct * 100) / 100,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
    updatedAt: rows[0]?.recorded_at ?? new Date().toISOString(),
    markup: MEP_MARKUP_PERCENT,
  };
}

// ---- KPIs ----
export async function getVendorKpis(
  db: any,
  vendorId: number
): Promise<VendorKpis> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  // Monthly sales in USD — STRICTLY filtered by vendor
  const [salesRow] = await db.query(
    `SELECT COALESCE(SUM(amount_usd), 0) AS total
     FROM payments
     WHERE vendor_id = $1
       AND payment_date >= $2
       AND status = 'confirmed'`,
    [vendorId, monthStart]
  );

  // Active files (status: in_progress, upcoming)
  const [filesRow] = await db.query(
    `SELECT COUNT(*) AS total
     FROM files
     WHERE vendor_id = $1
       AND status IN ('in_progress', 'upcoming')`,
    [vendorId]
  );

  // Monthly goal (optional — from vendor_goals table)
  const [goalRow] = await db.query(
    `SELECT target_usd
     FROM vendor_goals
     WHERE vendor_id = $1
       AND month = EXTRACT(MONTH FROM CURRENT_DATE)
       AND year = EXTRACT(YEAR FROM CURRENT_DATE)
     LIMIT 1`,
    [vendorId]
  );

  const monthlySales = Number(salesRow?.total ?? 0);
  const target = Number(goalRow?.target_usd ?? 0);

  return {
    monthlySalesUsd: monthlySales,
    activeFiles: Number(filesRow?.total ?? 0),
    goal: target > 0
      ? {
          target,
          current: monthlySales,
          percentage: Math.min(
            Math.round((monthlySales / target) * 100),
            100
          ),
        }
      : null,
  };
}

// ---- Notification Engine ----
// This is the core "semaphore" logic. Each query targets a
// specific business risk and assigns a priority color.

export async function getVendorNotifications(
  db: any,
  vendorId: number
): Promise<DashboardNotification[]> {
  const notifications: DashboardNotification[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // ─── 1. URGENT: Payment installments due today or overdue ───
  const paymentsDue = await db.query(
    `SELECT
       f.id AS file_id,
       f.client_name,
       pi.due_date,
       pi.amount_usd,
       pi.description
     FROM payment_installments pi
     JOIN files f ON f.id = pi.file_id
     WHERE f.vendor_id = $1
       AND pi.status = 'pending'
       AND pi.due_date <= $2
     ORDER BY pi.due_date ASC`,
    [vendorId, today]
  );

  for (const row of paymentsDue) {
    const days = daysDiff(today, row.due_date);
    notifications.push({
      id: `payment-${row.file_id}-${row.due_date}`,
      priority: 'urgent',
      type: 'payment_due',
      fileId: row.file_id,
      clientName: row.client_name,
      message:
        days === 0
          ? `File #${row.file_id} (${row.client_name}) — la seña vence HOY`
          : `File #${row.file_id} (${row.client_name}) — seña vencida hace ${Math.abs(days)} día(s)`,
      detail: `${row.description ?? 'Cuota'} — USD ${row.amount_usd}`,
      dueDate: row.due_date,
      daysRemaining: days,
      dismissed: false,
      actionUrl: `/files/${row.file_id}/payments`,
      actionLabel: 'Ver cobros',
    });
  }

  // ─── 2. URGENT: Operator payments due within 1 day ───
  const operatorPayments = await db.query(
    `SELECT
       f.id AS file_id,
       f.client_name,
       op.operator_name,
       op.due_date,
       op.amount_usd
     FROM operator_payments op
     JOIN files f ON f.id = op.file_id
     WHERE f.vendor_id = $1
       AND op.status = 'pending'
       AND op.due_date <= ($2::date + INTERVAL '1 day')
     ORDER BY op.due_date ASC`,
    [vendorId, today]
  );

  for (const row of operatorPayments) {
    const days = daysDiff(today, row.due_date);
    notifications.push({
      id: `operator-${row.file_id}-${row.due_date}`,
      priority: 'urgent',
      type: 'operator_payment_due',
      fileId: row.file_id,
      clientName: row.client_name,
      message:
        days <= 0
          ? `Pago a ${row.operator_name} por File #${row.file_id} vence HOY`
          : `Pago a ${row.operator_name} por File #${row.file_id} vence mañana`,
      detail: `USD ${row.amount_usd}`,
      dueDate: row.due_date,
      daysRemaining: days,
      dismissed: false,
      actionUrl: `/files/${row.file_id}/operator-payments`,
      actionLabel: 'Ver pago',
    });
  }

  // ─── 3. ATTENTION: Passport expiry < 6 months ───
  const sixMonthsOut = addMonths(new Date(), PASSPORT_EXPIRY_WARNING_MONTHS)
    .toISOString()
    .slice(0, 10);

  const passports = await db.query(
    `SELECT
       p.id AS passenger_id,
       p.full_name,
       p.passport_expiry,
       f.id AS file_id,
       f.client_name
     FROM passengers p
     JOIN file_passengers fp ON fp.passenger_id = p.id
     JOIN files f ON f.id = fp.file_id
     WHERE f.vendor_id = $1
       AND f.status IN ('in_progress', 'upcoming')
       AND p.passport_expiry IS NOT NULL
       AND p.passport_expiry <= $2
     ORDER BY p.passport_expiry ASC`,
    [vendorId, sixMonthsOut]
  );

  for (const row of passports) {
    const days = daysDiff(today, row.passport_expiry);
    notifications.push({
      id: `passport-${row.passenger_id}`,
      priority: 'attention',
      type: 'passport_expiry',
      fileId: row.file_id,
      clientName: row.full_name,
      message: `Pasaporte de ${row.full_name} (File #${row.file_id}) vence en ${days} días`,
      detail: `Vencimiento: ${formatDate(row.passport_expiry)}`,
      dueDate: row.passport_expiry,
      daysRemaining: days,
      dismissed: false,
      actionUrl: `/passengers/${row.passenger_id}`,
      actionLabel: 'Ver pasajero',
    });
  }

  // ─── 4. ATTENTION: Trips departing within 5 days ───
  const departureCutoff = addDays(new Date(), TRIP_DEPARTURE_WARNING_DAYS)
    .toISOString()
    .slice(0, 10);

  const departures = await db.query(
    `SELECT
       f.id AS file_id,
       f.client_name,
       f.departure_date,
       f.voucher_sent
     FROM files f
     WHERE f.vendor_id = $1
       AND f.status = 'upcoming'
       AND f.departure_date BETWEEN $2 AND $3
     ORDER BY f.departure_date ASC`,
    [vendorId, today, departureCutoff]
  );

  for (const row of departures) {
    const days = daysDiff(today, row.departure_date);
    const voucherNote = row.voucher_sent
      ? ''
      : ' — Voucher NO enviado';
    notifications.push({
      id: `departure-${row.file_id}`,
      priority: 'attention',
      type: 'trip_departure',
      fileId: row.file_id,
      clientName: row.client_name,
      message: `${row.client_name} sale de viaje en ${days} día(s)${voucherNote}`,
      detail: `Salida: ${formatDate(row.departure_date)}`,
      dueDate: row.departure_date,
      daysRemaining: days,
      dismissed: false,
      actionUrl: `/files/${row.file_id}`,
      actionLabel: row.voucher_sent ? 'Ver file' : 'Enviar voucher',
    });
  }

  // ─── 5. FOLLOWUP: Quotes not followed up in 48h ───
  const followupCutoff = new Date(
    Date.now() - QUOTE_FOLLOWUP_HOURS * 3600 * 1000
  ).toISOString();

  const staleQuotes = await db.query(
    `SELECT
       q.id AS quote_id,
       q.client_name,
       q.client_phone,
       q.created_at,
       q.destination
     FROM quotes q
     WHERE q.vendor_id = $1
       AND q.status = 'pending'
       AND q.followed_up = false
       AND q.created_at <= $2
     ORDER BY q.created_at ASC`,
    [vendorId, followupCutoff]
  );

  for (const row of staleQuotes) {
    const hoursAgo = Math.round(
      (Date.now() - new Date(row.created_at).getTime()) / 3600000
    );
    notifications.push({
      id: `followup-${row.quote_id}`,
      priority: 'followup',
      type: 'quote_followup',
      fileId: null,
      clientName: row.client_name,
      message: `Llamar a ${row.client_name} — pidió cotización hace ${hoursAgo}hs`,
      detail: `Destino: ${row.destination}`,
      dueDate: row.created_at,
      daysRemaining: 0,
      dismissed: false,
      actionUrl: `/quotes/${row.quote_id}`,
      actionLabel: 'Ver cotización',
    });
  }

  // Sort: urgent first, then attention, then followup
  const priorityOrder: Record<string, number> = {
    urgent: 0,
    attention: 1,
    followup: 2,
  };

  notifications.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.daysRemaining - b.daysRemaining;
  });

  return notifications;
}

// ---- Aggregate all dashboard data ----
export async function getVendorDashboardData(
  db: any,
  vendorId: number
): Promise<VendorDashboardData> {
  const [exchangeRate, kpis, notifications] = await Promise.all([
    getExchangeRate(db),
    getVendorKpis(db, vendorId),
    getVendorNotifications(db, vendorId),
  ]);

  return { exchangeRate, kpis, notifications };
}

// ---- Dismiss a notification ----
export async function dismissNotification(
  db: any,
  vendorId: number,
  notificationId: string
): Promise<void> {
  // Store dismissed notifications per vendor in a lightweight table
  await db.query(
    `INSERT INTO dismissed_notifications (vendor_id, notification_key, dismissed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (vendor_id, notification_key) DO NOTHING`,
    [vendorId, notificationId]
  );
}

// ---- Utility helpers ----
function daysDiff(from: string, to: string): number {
  const msPerDay = 86400000;
  const d1 = new Date(from);
  const d2 = new Date(to);
  return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
