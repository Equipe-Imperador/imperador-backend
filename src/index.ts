import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { startMqttClient } from './services/mqttService';
import userRoutes from './routes/userRoutes';
import telemetryRoutes from './routes/telemetryRoutes';

dotenv.config();

const PORT = 3000;
const app = express();

app.use(cors);
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/telemetry', telemetryRoutes);


// Voltamos ao 'app.listen' simples, sem o servidor http e sem WebSocket
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
  console.log(`🚀 Servidor rodando com sucesso em http://72.60.141.159:${PORT}`);
  startMqttClient();
});
