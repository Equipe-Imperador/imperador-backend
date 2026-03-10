import { Router } from 'express';
// Importa as funções do controlador de telemetria
import { 
  getHistoricalData, 
  getLatestData, 
  callDriverToBox, 
  exportData,
  toggleDifferential,
  toggleHorn
} from '../controllers/telemetryController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Rota de dados históricos: protegida e só pode ser acessada por 'juiz' ou 'integrante'
router.get('/history', protect, authorize('juiz', 'integrante'), getHistoricalData);
router.get('/latest', protect, authorize('juiz', 'integrante'), getLatestData);

// Rota para enviar o comando de Box (PIT). Apenas 'integrantes' podem chamar o piloto.
router.post('/pit-call', protect, authorize('integrante'), callDriverToBox);

// Rota para exportar dados. Apenas 'integrantes' podem baixar.
router.get('/export', protect, authorize('integrante'), exportData);

// --- NOVAS ROTAS DE ACIONAMENTO ---
// Rotas para ligar/desligar atuadores do carro. Apenas 'integrantes' têm permissão.
router.post('/action/differential', protect, authorize('integrante'), toggleDifferential);
router.post('/action/horn', protect, authorize('integrante'), toggleHorn);

export default router;