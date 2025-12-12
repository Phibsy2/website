import { Router } from 'express';
import * as walkerController from '../controllers/walker.controller.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validate, walkerProfileSchema, updateWalkerProfileSchema, availabilitySchema, reviewSchema, idParamSchema } from '../middleware/validation.js';

const router = Router();

// Öffentliche Routen
router.get('/', optionalAuth, walkerController.getWalkers);
router.get('/:id', validate(idParamSchema, 'params'), walkerController.getProfile);

// Authentifizierte Routen
router.use(authenticate);

// Walker-Profil verwalten
router.post('/profile', validate(walkerProfileSchema), walkerController.createProfile);
router.get('/profile/me', authorize('WALKER', 'ADMIN'), walkerController.getMyProfile);
router.patch('/profile', authorize('WALKER', 'ADMIN'), validate(updateWalkerProfileSchema), walkerController.updateProfile);

// Statistiken
router.get('/stats/me', authorize('WALKER', 'ADMIN'), walkerController.getStats);

// Service-Gebiete
router.post('/service-areas', authorize('WALKER', 'ADMIN'), walkerController.addServiceArea);
router.delete('/service-areas/:postalCode', authorize('WALKER', 'ADMIN'), walkerController.removeServiceArea);

// Verfügbarkeit
router.post('/availability', authorize('WALKER', 'ADMIN'), validate(availabilitySchema), walkerController.setAvailability);
router.delete('/availability/:id', authorize('WALKER', 'ADMIN'), walkerController.removeAvailability);

// Bewertungen (von Kunden)
router.post('/reviews/:bookingId', validate(reviewSchema), walkerController.addReview);

export default router;
