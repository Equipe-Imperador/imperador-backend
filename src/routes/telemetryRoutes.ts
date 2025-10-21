import { Router } from 'express';
// Importa a função do controlador de telemetria
import { getHistoricalData, getLatestData ,callDriverToBox, exportData} from '../controllers/telemetryController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Rota de dados históricos: protegida e só pode ser acessada por 'juiz' ou 'integrante'
router.get('/history', protect, authorize('juiz', 'integrante'), getHistoricalData);
router.get('/latest', protect, authorize('juiz', 'integrante'), getLatestData);

// Nova rota para enviar o comando. Apenas 'integrantes' podem chamar o piloto.
router.post('/pit-call', protect, authorize('integrante'), callDriverToBox);

// Rota para exportar dados. Apenas 'integrantes' podem baixar.
router.get('/export', protect, authorize('integrante'), exportData);

export default router;
