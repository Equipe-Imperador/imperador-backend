import mqtt from 'mqtt';
import pool from '../db';
import { broadcast } from './webSocketService';


const batchBuffer: any[] = [];


const brokerUrl = 'mqtt://72.60.141.159';

const options : mqtt.IClientOptions = {
  clientId: `imperador_client_${Math.random().toString(16).slice(2, 8)}`,
  username: 'imperador_mqtt', 
  password: 'imperador25', 
  reconnectPeriod: 2000, // Tenta reconectar a cada 5 segundos se a conexão cair
};




const client = mqtt.connect(brokerUrl, options);

const telemetryTopic = 'imperador/telemetria';
export const commandTopic = 'imperador/comandos/box';

export const startMqttClient = () => {
  client.on('connect', () => {
    console.log(' Conectado ao broker MQTT com sucesso!');
    client.subscribe([telemetryTopic, commandTopic], (err) => {
      if (!err) {
        console.log(` Inscrito no tópico: "${telemetryTopic}"`);
      } else{
	console.error ('erro')}
    });
  });

  client.on("message", async (topic, message) => {
  if (topic === telemetryTopic) {
    try {
      const data = JSON.parse(message.toString());

      // manda para o front (WebSocket)
      broadcast(data);

      // adiciona no buffer para o batch
      batchBuffer.push(data);

      console.log(" Telemetria recebida:", data);

      // salva no banco individual
      const {
        tensao_bateria, corrente_bateria, temperatura_bateria,
        pressao_freio_traseira, pressao_freio_dianteiro,
        rpm_motor, velocidade_eixo_traseiro, temp_cvt,
        curso_pedal_acelerador, curso_pedal_freio,
        acelerometro_x, acelerometro_y, acelerometro_z,
        gyro_x, gyro_y, gyro_z,
        ang_x, ang_y, ang_z, dif
      } = data;

      await pool.query(
        `INSERT INTO telemetry_data (
          "time", tensao_bateria, corrente_bateria, temperatura_bateria,
          pressao_freio_traseira, pressao_freio_dianteiro,
          rpm_motor, velocidade_eixo_traseiro, temp_cvt,
          curso_pedal_acelerador, curso_pedal_freio,
          acelerometro_x, acelerometro_y, acelerometro_z,
          gyro_x, gyro_y, gyro_z,
          ang_x, ang_y, ang_z, dif
        ) VALUES (
          NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )`,
        [
          tensao_bateria, corrente_bateria, temperatura_bateria,
          pressao_freio_traseira, pressao_freio_dianteiro,
          rpm_motor, velocidade_eixo_traseiro, temp_cvt,
          curso_pedal_acelerador, curso_pedal_freio,
          acelerometro_x, acelerometro_y, acelerometro_z,
          gyro_x, gyro_y, gyro_z,
          ang_x, ang_y, ang_z, dif
        ]
      );

    } catch (error) {
      console.error(" Erro processando telemetria:", error);
    }
  }
	else if (topic === commandTopic) {
      // NOVO: logar os comandos de BOX que chegaram no broker
      console.log(" Comando BOX recebido no backend:", message.toString());
      // se quiser, pode também fazer um broadcast pro WebSocket ou salvar em BD
    }
});
   
  // O que fazer quando a biblioteca tenta reconectar
  client.on('reconnect', () => {
    console.log(' Tentando reconectar ao broker MQTT...');
  });

  // O que fazer quando a conexão é fechada
  client.on('close', () => {
    console.log(' Conexão MQTT fechada.');
  });

  // O que fazer se o cliente ficar offline
  client.on('offline', () => {
    console.log(' Cliente MQTT está offline.');
  });

  


  client.on('error', (error) => {
    console.error(' Erro no cliente MQTT:', error);
  });
};

//logica batch 
setInterval(async () => {
  if (batchBuffer.length === 0) return;

  const copy = [...batchBuffer];
  batchBuffer.length = 0;

  try {
    await pool.query(
      `INSERT INTO telemetry_batch (dados)
       VALUES ($1)`,
      [JSON.stringify(copy)]
    );

    console.log(` Batch salvo com ${copy.length} mensagens`);
  } catch (err) {
    console.error(" Erro ao salvar batch:", err);
  }
}, 1000);

export { client as mqttClient };
