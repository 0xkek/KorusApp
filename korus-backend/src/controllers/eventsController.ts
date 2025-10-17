import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { verifySignature } from '../services/signatureService';

// Get all events
export const getEvents = async (req: Request, res: Response) => {
  try {
    const { type, status, featured } = req.query;

    const where: any = {};

    if (type) where.type = type as string;
    if (status) where.status = status as string;
    if (featured === 'true') where.featured = true;

    const events = await prisma.event.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { startDate: 'desc' }
      ],
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });

    // Transform to include registration count
    const eventsWithCounts = events.map(event => ({
      ...event,
      registrationCount: event._count.registrations
    }));

    res.json({
      success: true,
      events: eventsWithCounts
    });
  } catch (error) {
    logger.error('Get events error:', error);
    res.status(500).json({ success: false, error: 'Failed to get events' });
  }
};

// Get single event
export const getEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Increment view count
    await prisma.event.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({
      success: true,
      event: {
        ...event,
        registrationCount: event._count.registrations
      }
    });
  } catch (error) {
    logger.error('Get event error:', error);
    res.status(500).json({ success: false, error: 'Failed to get event' });
  }
};

// Create event
export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!;
    const {
      type,
      projectName,
      title,
      description,
      imageUrl,
      externalLink,
      maxSpots,
      startDate,
      endDate,
      selectionMethod,
      requirements,
      minReputation,
      minAccountAge
    } = req.body;

    // Validation
    if (!type || !projectName || !title || !description || !externalLink || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }

    const event = await prisma.event.create({
      data: {
        type,
        projectName,
        title,
        description,
        imageUrl,
        externalLink,
        maxSpots: maxSpots ? parseInt(maxSpots) : null,
        startDate: start,
        endDate: end,
        selectionMethod: selectionMethod || 'fcfs',
        requirements: requirements || [],
        minReputation: minReputation ? parseInt(minReputation) : null,
        minAccountAge: minAccountAge ? parseInt(minAccountAge) : null,
        creatorWallet: walletAddress
      }
    });

    logger.debug(`Event created: ${event.id} by ${walletAddress}`);

    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    logger.error('Create event error:', error);
    res.status(500).json({ success: false, error: 'Failed to create event' });
  }
};

// Register for whitelist
export const registerForWhitelist = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const walletAddress = req.userWallet!;
    const { signature, signedMessage, metadata } = req.body;

    // Validation
    if (!signature || !signedMessage) {
      return res.status(400).json({
        success: false,
        error: 'Signature and signed message are required'
      });
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Check if event is active
    if (event.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Event is not active'
      });
    }

    // Check if registration is still open
    const now = new Date();
    if (now < event.startDate) {
      return res.status(400).json({
        success: false,
        error: 'Registration has not started yet'
      });
    }
    if (now > event.endDate) {
      return res.status(400).json({
        success: false,
        error: 'Registration has closed'
      });
    }

    // Check if spots are available (for FCFS)
    if (event.maxSpots && event._count.registrations >= event.maxSpots && event.selectionMethod === 'fcfs') {
      return res.status(400).json({
        success: false,
        error: 'Whitelist is full'
      });
    }

    // Check if already registered
    const existingRegistration = await prisma.whitelistRegistration.findUnique({
      where: {
        eventId_walletAddress: {
          eventId: id,
          walletAddress
        }
      }
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        error: 'Already registered for this event'
      });
    }

    // Verify signature
    const isValid = await verifySignature(walletAddress, signedMessage, signature);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Verify the message contains the event ID
    if (!signedMessage.includes(id)) {
      return res.status(401).json({
        success: false,
        error: 'Signed message does not match event'
      });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check minimum requirements
    if (event.minReputation && user.reputationScore < event.minReputation) {
      return res.status(403).json({
        success: false,
        error: `Minimum reputation of ${event.minReputation} required`
      });
    }

    const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (event.minAccountAge && accountAge < event.minAccountAge) {
      return res.status(403).json({
        success: false,
        error: `Account must be at least ${event.minAccountAge} days old`
      });
    }

    // Calculate position for FCFS
    const position = event.selectionMethod === 'fcfs' ? event._count.registrations + 1 : null;

    // Create registration
    const registration = await prisma.whitelistRegistration.create({
      data: {
        eventId: id,
        walletAddress,
        signature,
        signedMessage,
        reputationScore: user.reputationScore,
        accountAge,
        position,
        metadata: metadata || {},
        status: event.selectionMethod === 'fcfs' && event.maxSpots && position! > event.maxSpots
          ? 'waitlist'
          : 'registered'
      }
    });

    // Update event registration count
    await prisma.event.update({
      where: { id },
      data: { registrationCount: { increment: 1 } }
    });

    logger.debug(`Whitelist registration: ${walletAddress} joined event ${id}`);

    res.status(201).json({
      success: true,
      registration: {
        ...registration,
        position: position || undefined
      },
      message: position
        ? `You're #${position} on the whitelist!`
        : 'Successfully registered for the whitelist!'
    });
  } catch (error) {
    logger.error('Register for whitelist error:', error);
    res.status(500).json({ success: false, error: 'Failed to register for whitelist' });
  }
};

// Get user's registration status for an event
export const getRegistrationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const walletAddress = req.userWallet!;

    const registration = await prisma.whitelistRegistration.findUnique({
      where: {
        eventId_walletAddress: {
          eventId: id,
          walletAddress
        }
      }
    });

    res.json({
      success: true,
      registered: !!registration,
      registration: registration || null
    });
  } catch (error) {
    logger.error('Get registration status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get registration status' });
  }
};

// Get registrations for an event (project owner only)
export const getEventRegistrations = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const walletAddress = req.userWallet!;

    // Get event
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Check if user is the creator
    if (event.creatorWallet !== walletAddress) {
      return res.status(403).json({ success: false, error: 'Only event creator can view registrations' });
    }

    // Get registrations
    const registrations = await prisma.whitelistRegistration.findMany({
      where: { eventId: id },
      orderBy: [
        { position: 'asc' },
        { registeredAt: 'asc' }
      ]
    });

    res.json({
      success: true,
      registrations,
      total: registrations.length
    });
  } catch (error) {
    logger.error('Get event registrations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get registrations' });
  }
};

// Export registrations as CSV (project owner only)
export const exportRegistrations = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { format } = req.query;
    const walletAddress = req.userWallet!;

    // Get event
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Check if user is the creator
    if (event.creatorWallet !== walletAddress) {
      return res.status(403).json({ success: false, error: 'Only event creator can export registrations' });
    }

    // Get registrations
    const registrations = await prisma.whitelistRegistration.findMany({
      where: { eventId: id },
      orderBy: [
        { position: 'asc' },
        { registeredAt: 'asc' }
      ]
    });

    if (format === 'json') {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${event.projectName}-whitelist.json"`);
      res.json({
        event: {
          id: event.id,
          title: event.title,
          projectName: event.projectName,
          exportedAt: new Date().toISOString(),
          totalRegistrations: registrations.length
        },
        registrations: registrations.map(r => ({
          position: r.position || null,
          walletAddress: r.walletAddress,
          reputationScore: r.reputationScore,
          accountAge: r.accountAge,
          registeredAt: r.registeredAt.toISOString(),
          status: r.status,
          metadata: r.metadata
        }))
      });
    } else {
      // CSV export (default)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${event.projectName}-whitelist.csv"`);

      // CSV headers
      let csv = 'Position,Wallet_Address,Reputation_Score,Account_Age_Days,Registered_At,Status\n';

      // CSV rows
      registrations.forEach(r => {
        csv += `${r.position || ''},${r.walletAddress},${r.reputationScore},${r.accountAge},${r.registeredAt.toISOString()},${r.status}\n`;
      });

      res.send(csv);
    }
  } catch (error) {
    logger.error('Export registrations error:', error);
    res.status(500).json({ success: false, error: 'Failed to export registrations' });
  }
};

// Close event early (project owner only)
export const closeEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const walletAddress = req.userWallet!;

    // Get event
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Check if user is the creator
    if (event.creatorWallet !== walletAddress) {
      return res.status(403).json({ success: false, error: 'Only event creator can close event' });
    }

    // Update event status
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status: 'closed' }
    });

    logger.debug(`Event closed: ${id} by ${walletAddress}`);

    res.json({
      success: true,
      event: updatedEvent,
      message: 'Event closed successfully'
    });
  } catch (error) {
    logger.error('Close event error:', error);
    res.status(500).json({ success: false, error: 'Failed to close event' });
  }
};

// Cancel event (project owner only)
export const cancelEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const walletAddress = req.userWallet!;

    // Get event
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Check if user is the creator
    if (event.creatorWallet !== walletAddress) {
      return res.status(403).json({ success: false, error: 'Only event creator can cancel event' });
    }

    // Check if already cancelled
    if (event.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Event is already cancelled' });
    }

    // Update event status
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    logger.debug(`Event cancelled: ${id} by ${walletAddress} (${event._count.registrations} participants affected)`);

    // TODO: Send notifications to all registered participants
    // This could be implemented later with a notification system

    res.json({
      success: true,
      event: {
        ...updatedEvent,
        registrationCount: event._count.registrations
      },
      message: 'Event cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel event error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel event' });
  }
};

// Get user's created events
export const getMyEvents = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!;

    const events = await prisma.event.findMany({
      where: {
        creatorWallet: walletAddress
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });

    // Transform to include registration count
    const eventsWithCounts = events.map(event => ({
      ...event,
      registrationCount: event._count.registrations
    }));

    res.json({
      success: true,
      events: eventsWithCounts
    });
  } catch (error) {
    logger.error('Get my events error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user events' });
  }
};
