import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;

export const initializeWebSocketServer = (server: Server) => {
  wss = new WebSocketServer({ server });
  console.log('✅ Servidor WebSocket iniciado e acoplado ao servidor HTTP.');

  wss.on('connection', (ws) => {
    console.log('🔗 Novo cliente WebSocket conectado.');
    ws.on('close', () => {
      console.log('🔌 Cliente WebSocket desconectado.');
    });
  });
};

// Esta função enviará os dados para TODOS os front-ends conectados
export const broadcast = (data: any) => {
  if (!wss) return;

  const jsonData = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonData);
    }
  });
};
