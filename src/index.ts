import express from 'express';
import dotenv from 'dotenv'; 
import pool from './db'; // Importa nosso pool de conexão
import userRoutes from './routes/userRoutes'; // Importa nossas rotas de usuário
import telemetryRoutes from './routes/telemetryRoutes'; // Importa as rotas de telemetria
import { startMqttClient } from './services/mqttService'; // Importa o serviço MQTT

dotenv.config();

const PORT = 3000;
const app = express();

// Middleware para o Express entender requisições com corpo em JSON
app.use(express.json());

// Rota de teste da conexão com o banco
app.get('/test-db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    res.send(`Conexão bem-sucedida! Hora do banco de dados: ${result.rows[0].now}`);
    client.release();
  } catch (error) {
    res.status(500).send('Erro ao conectar ao banco de dados.');
  }
});

// Diz ao Express para usar nossas rotas de usuário para qualquer endereço que comece com /api/users
app.use('/api/users', userRoutes);
app.use('/api/telemetry', telemetryRoutes); // Usa as rotas de telemetria

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando com sucesso em http://localhost:${PORT}`);
  startMqttClient(); // Inicia o cliente MQTT quando o servidor Express estiver rodando
});