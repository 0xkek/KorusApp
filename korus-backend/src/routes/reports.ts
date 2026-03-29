import { Router, Response, NextFunction } from 'express'
import {
  createReport,
  getReports,
  getReport,
  updateReportStatus,
  getContentReports
} from '../controllers/reportController'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// Admin wallets that can view/manage reports
const ADMIN_WALLETS = [
  'G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG',
  '5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L'
]

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.userWallet || !ADMIN_WALLETS.includes(req.userWallet)) {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

// POST /api/reports - Create a new report (requires auth)
router.post('/', authenticate, createReport)

// GET /api/reports - Get all reports (admin only)
router.get('/', authenticate, requireAdmin, getReports)

// GET /api/reports/:id - Get a specific report (admin only)
router.get('/:id', authenticate, requireAdmin, getReport)

// PUT /api/reports/:id/status - Update report status (admin only)
router.put('/:id/status', authenticate, requireAdmin, updateReportStatus)

// GET /api/reports/content/:targetId - Get reports for specific content (admin only)
router.get('/content/:targetId', authenticate, requireAdmin, getContentReports)

export default router