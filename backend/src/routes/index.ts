import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import bookingRoutes from './booking.routes.js';
import walkerRoutes from './walker.routes.js';
import groupWalkRoutes from './groupWalk.routes.js';
import adminRoutes from './admin.routes.js';
import { checkDatabaseHealth } from '../services/database.js';
import { ApiResponse } from '../types/index.js';

const router = Router();

// Health Check Endpoint
router.get('/health', async (req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseHealth();

  const response: ApiResponse = {
    success: dbHealthy,
    data: {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        api: 'running',
      },
    },
  };

  res.status(dbHealthy ? 200 : 503).json(response);
});

// API Info Endpoint
router.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'Dog Walking Platform API',
      version: '1.0.0',
      documentation: '/api/docs',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        bookings: '/api/bookings',
        walkers: '/api/walkers',
        groupWalks: '/api/group-walks',
        admin: '/api/admin',
      },
    },
  };

  res.json(response);
});

// Route Registration
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/bookings', bookingRoutes);
router.use('/walkers', walkerRoutes);
router.use('/group-walks', groupWalkRoutes);
router.use('/admin', adminRoutes);

export default router;
