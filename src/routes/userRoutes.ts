import { Router } from 'express';
import { registerUser, loginUser, getUserProfile, getAdminData, adminCreateUser } from '../controllers/userController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.post('/admin-create', protect, authorize('integrante'), adminCreateUser);
router.get('/admin', protect, authorize('administrador'), getAdminData);

export default router;
