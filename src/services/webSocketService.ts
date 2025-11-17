import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

let wss: WebSocketServer;

export const initializeWebSocketServer = (server: Server) => {
  wss = new WebSocketServer({ server });

  console.log("✅ WebSocket Server iniciado.");

  wss.on("connection", (ws: WebSocket) => {
    console.log("🔗 Cliente conectado no WebSocket.");

    // Heartbeat para evitar timeouts
    (ws as any).isAlive = true;

    ws.on("pong", () => {
      (ws as any).isAlive = true;
    });

    ws.on("close", () => {
      console.log("🔌 Cliente desconectado.");
    });
  });

  // Intervalo para verificar conexões mortas
  setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
};

// Broadcast seguro e eficiente
export const broadcast = (data: any) => {
  if (!wss) return;

  const json = JSON.stringify(data);

  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
};
