// ============================================================
// Tijuca Travel - Vendor Dashboard API Routes
// Express/Next.js API route handlers
// ============================================================

import { Router, Request, Response } from 'express';
import {
  getVendorDashboardData,
  dismissNotification,
} from './vendor-dashboard.service';

const router = Router();

// Middleware: extract current vendor from auth token
// This ensures WHERE vendor_id = current_user at every level.
function getVendorId(req: Request): number {
  // Replace with your actual auth extraction logic
  const vendorId = (req as any).user?.id;
  if (!vendorId) throw new Error('Unauthorized');
  return vendorId;
}

// GET /api/vendor/dashboard
// Returns all dashboard data in a single call
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const vendorId = getVendorId(req);
    const db = (req as any).db; // your DB connection

    const data = await getVendorDashboardData(db, vendorId);

    res.json({ ok: true, data });
  } catch (err: any) {
    console.error('[VendorDashboard]', err);
    res.status(err.message === 'Unauthorized' ? 401 : 500).json({
      ok: false,
      error: err.message,
    });
  }
});

// POST /api/vendor/notifications/:id/dismiss
// Mark a notification as "done"
router.post(
  '/notifications/:id/dismiss',
  async (req: Request, res: Response) => {
    try {
      const vendorId = getVendorId(req);
      const db = (req as any).db;
      const notificationId = req.params.id;

      await dismissNotification(db, vendorId, notificationId);

      res.json({ ok: true });
    } catch (err: any) {
      console.error('[DismissNotification]', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

export default router;
