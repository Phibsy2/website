import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate, updateProfileSchema, addressSchema, dogSchema, idParamSchema } from '../middleware/validation.js';

const router = Router();

// Alle Routen erfordern Authentifizierung
router.use(authenticate);

// Profil
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);

// Adressen
router.get('/addresses', userController.getAddresses);
router.post('/addresses', validate(addressSchema), userController.addAddress);
router.patch('/addresses/:id', validate(idParamSchema, 'params'), userController.updateAddress);
router.delete('/addresses/:id', validate(idParamSchema, 'params'), userController.deleteAddress);

// Hunde
router.get('/dogs', userController.getDogs);
router.post('/dogs', validate(dogSchema), userController.addDog);
router.patch('/dogs/:id', validate(idParamSchema, 'params'), userController.updateDog);
router.delete('/dogs/:id', validate(idParamSchema, 'params'), userController.deleteDog);

// Benachrichtigungen
router.get('/notifications', userController.getNotifications);
router.post('/notifications/:id/read', validate(idParamSchema, 'params'), userController.markNotificationRead);
router.post('/notifications/read-all', userController.markAllNotificationsRead);

export default router;
