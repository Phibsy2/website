import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, idParamSchema } from '../middleware/validation.js';

const router = Router();

// Alle Admin-Routen erfordern Authentifizierung und Admin-Rolle
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Benutzer-Verwaltung
router.get('/users', adminController.getUsers);
router.post('/users/:id/toggle-status', validate(idParamSchema, 'params'), adminController.toggleUserStatus);

// Buchungs-Verwaltung
router.get('/bookings', adminController.getAllBookings);
router.post('/bookings/:id/assign', validate(idParamSchema, 'params'), adminController.assignBookingToWalker);

// Walker-Verwaltung
router.get('/walkers', adminController.getAllWalkers);

// Gruppentermin-Verwaltung
router.get('/group-walks', adminController.getAllGroupWalks);

// Reports
router.get('/reports/revenue', adminController.getRevenueReport);

// Systemkonfiguration
router.get('/config', adminController.getSystemConfig);
router.put('/config', adminController.updateSystemConfig);

export default router;
