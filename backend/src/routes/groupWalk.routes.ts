import { Router } from 'express';
import * as groupWalkController from '../controllers/groupWalk.controller.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validate, createGroupWalkSchema, joinGroupWalkSchema, idParamSchema } from '../middleware/validation.js';

const router = Router();

// Öffentliche Routen
router.get('/', optionalAuth, groupWalkController.getGroupWalks);
router.get('/:id', validate(idParamSchema, 'params'), groupWalkController.getGroupWalk);

// Authentifizierte Routen
router.use(authenticate);

// Walker: Gruppentermin erstellen/verwalten
router.post('/', authorize('WALKER', 'ADMIN'), validate(createGroupWalkSchema), groupWalkController.createGroupWalk);
router.post('/:id/start', authorize('WALKER', 'ADMIN'), validate(idParamSchema, 'params'), groupWalkController.startGroupWalk);
router.post('/:id/complete', authorize('WALKER', 'ADMIN'), validate(idParamSchema, 'params'), groupWalkController.completeGroupWalk);
router.post('/:id/cancel', authorize('WALKER', 'ADMIN'), validate(idParamSchema, 'params'), groupWalkController.cancelGroupWalk);

// Kunde: Teilnahme
router.post('/:id/join', validate(idParamSchema, 'params'), validate(joinGroupWalkSchema), groupWalkController.joinGroupWalk);
router.post('/:id/leave', validate(idParamSchema, 'params'), groupWalkController.leaveGroupWalk);

export default router;
