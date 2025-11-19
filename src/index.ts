import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';

import { startMqttClient } from './services/mqttService';
import { initializeWebSocketServer } from './services/webSocketService';

import userRoutes from './routes/userRoutes';
import telemetryRoutes from './routes/telemetryRoutes';

dotenv.config();

const PORT = 3000;
const app = express();

// Criar servidor HTTP real (necessário para WebSocket)
const server = http.createServer(app);

app.use(
  cors({
    origin: ['http://72.60.141.159', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Rotas REST
app.use('/api/users', userRoutes);
app.use('/api/telemetry', telemetryRoutes);

// ⭐ Ativar servidor WebSocket aqui
initializeWebSocketServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://72.60.141.159:${PORT}`);
  startMqttClient();
});
