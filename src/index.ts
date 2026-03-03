import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { startMqttClient } from './services/mqttService';
import userRoutes from './routes/userRoutes';
import telemetryRoutes from './routes/telemetryRoutes';

dotenv.config();

const PORT = 3000;
const app = express();

app.use(cors({
  origin: ['http://72.60.141.159', 'http://localhost:5173'], // ajuste conforme o ambiente
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/telemetry', telemetryRoutes);

// Voltamos ao 'app.listen' simples, sem o servidor http e sem WebSocket
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando com sucesso em http://72.60.141.159:${PORT}`);
  startMqttClient();
});
