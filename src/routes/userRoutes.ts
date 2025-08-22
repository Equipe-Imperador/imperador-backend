import { Router } from 'express';
// Importa a nova função de perfil e o middleware de proteção
import { registerUser, loginUser, getUserProfile , getAdminData} from '../controllers/userController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);


// O middleware 'protect' é colocado ANTES do controlador 'getUserProfile'
// Ele agirá como um segurança, barrando a entrada se o token não for válido
router.get('/profile', protect, getUserProfile);

// Rota protegida apenas para administradores
// Note como encadeamos os middlewares: primeiro 'protect', depois 'authorize'
router.get('/admin', protect, authorize('administrador'), getAdminData);


export default router;