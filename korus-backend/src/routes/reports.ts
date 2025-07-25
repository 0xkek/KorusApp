import { Router } from 'express'
import { 
  createReport, 
  getReports, 
  getReport, 
  updateReportStatus, 
  getContentReports 
} from '../controllers/reportController'
import { authenticate } from '../middleware/auth'

const router = Router()

// POST /api/reports - Create a new report (requires auth)
router.post('/', authenticate, createReport)

// GET /api/reports - Get all reports (for moderators - requires auth)
router.get('/', authenticate, getReports)

// GET /api/reports/:id - Get a specific report (requires auth)
router.get('/:id', authenticate, getReport)

// PUT /api/reports/:id/status - Update report status (for moderators - requires auth)
router.put('/:id/status', authenticate, updateReportStatus)

// GET /api/reports/content/:targetId - Get reports for specific content (requires auth)
router.get('/content/:targetId', authenticate, getContentReports)

export default router