import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, createBookingSchema, updateBookingSchema, idParamSchema } from '../middleware/validation.js';

const router = Router();

// Alle Routen erfordern Authentifizierung
router.use(authenticate);

// Kunde: Eigene Buchungen
router.get('/my', bookingController.getMyBookings);
router.post('/', validate(createBookingSchema), bookingController.createBooking);

// Walker: Zugewiesene Buchungen
router.get('/walker', authorize('WALKER', 'ADMIN'), bookingController.getWalkerBookings);

// Einzelne Buchung
router.get('/:id', validate(idParamSchema, 'params'), bookingController.getBooking);
router.patch('/:id', validate(idParamSchema, 'params'), validate(updateBookingSchema), bookingController.updateBooking);
router.post('/:id/cancel', validate(idParamSchema, 'params'), bookingController.cancelBooking);

// Admin: Walker zuweisen
router.post('/:id/assign', authorize('ADMIN'), validate(idParamSchema, 'params'), bookingController.assignWalker);

// Gruppierungsvorschläge (für Admins und Walker)
router.get('/suggestions/grouping', authorize('WALKER', 'ADMIN'), bookingController.getGroupingSuggestions);

export default router;
