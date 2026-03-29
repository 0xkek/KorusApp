import express from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../config/database';
import {
  getEvents,
  getEvent,
  createEvent,
  registerForWhitelist,
  getRegistrationStatus,
  getEventRegistrations,
  exportRegistrations,
  closeEvent,
  cancelEvent,
  getMyEvents,
  getUserEventHistory
} from '../controllers/eventsController';

const router = express.Router();

// Public routes
router.get('/', getEvents);

// Public: get event creation fee
router.get('/config/creation-fee', async (_req, res) => {
  try {
    const config = await prisma.platformConfig.findUnique({
      where: { key: 'event_creation_fee' }
    });
    res.json({ success: true, fee: config ? parseFloat(config.value) : 0.1 });
  } catch {
    res.json({ success: true, fee: 0.1 }); // fallback
  }
});

// Protected routes (require authentication)
// IMPORTANT: Specific routes like /my-events must come before /:id to prevent route collision
router.get('/my-events', authenticate, getMyEvents);
router.get('/user/:walletAddress', getUserEventHistory);
router.post('/', authenticate, createEvent);

// Public dynamic route - must come after specific routes
router.get('/:id', getEvent);
router.post('/:id/register', authenticate, registerForWhitelist);
router.get('/:id/status', authenticate, getRegistrationStatus);
router.get('/:id/registrations', authenticate, getEventRegistrations);
router.get('/:id/export', authenticate, exportRegistrations);
router.post('/:id/close', authenticate, closeEvent);
router.post('/:id/cancel', authenticate, cancelEvent);

export default router;
