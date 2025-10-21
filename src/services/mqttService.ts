import mqtt from 'mqtt';
import pool from '../db';
// A importação do broadcast fica aqui para o futuro, quando reativarmos os WebSockets.
// import { broadcast } from './webSocketService';

const brokerUrl = 'mqtt://localhost';

const options : mqtt.IClientOptions = {
  clientId: `imperador_client_${Math.random().toString(16).slice(2, 8)}`,
  username: 'imperador_mqtt', // O usuário que você criou
  password: 'imperador25', 
  reconnectPeriod: 2000, // Tenta reconectar a cada 2 segundos se a conexão cair
};




const client = mqtt.connect(brokerUrl, options);

const telemetryTopic = 'imperador/telemetria';
export const commandTopic = 'imperador/comandos/box';

export const startMqttClient = () => {
  client.on('connect', () => {
    console.log('✅ Conectado ao broker MQTT com sucesso!');
    client.subscribe([telemetryTopic, commandTopic], (err) => {
      if (!err) {
        console.log(`📡 Inscrito no tópico: "${telemetryTopic}"`);
      } else{
	console.error ('erro')}
    });
  });

  client.on('message', async (topic, message) => {
    if (topic === telemetryTopic) {
      try {
        const dataString = message.toString();
        const data = JSON.parse(dataString);
	console.log('📩 Mensagem recebida do tópico', topic, ':', message.toString());

        // broadcast(data); // Envia os dados para o front-end via WebSocket (desativado por agora)

        // Extrai as variáveis do JSON
        const {
          tensao_bateria, temperatura_bateria, temp_freio_traseiro,
          pressao_freio_traseira, pressao_freio_dianteiro, temp_freio_dianteiro,
          rpm_motor, nivel_combustivel, velocidade_eixo_traseiro,
          velocidade_dianteiro_esq, velocidade_dianteiro_dir,
          temp_oleo_caixa, temp_cvt, pressao_cvt,
          curso_pedal_acelerador, curso_pedal_freio, angulo_estercamento,
          acelerometro_x, acelerometro_y, acelerometro_z
        } = data;

        // Consulta INSERT corrigida para bater exatamente com as colunas da tabela
        await pool.query(
          `INSERT INTO telemetry_data (
            "time", tensao_bateria, temperatura_bateria, temp_freio_traseiro,
            pressao_freio_traseira, pressao_freio_dianteiro, temp_freio_dianteiro,
            rpm_motor, nivel_combustivel, velocidade_eixo_traseiro,
            velocidade_dianteiro_esq, velocidade_dianteiro_dir,
            temp_oleo_caixa, temp_cvt, pressao_cvt,
            curso_pedal_acelerador, curso_pedal_freio, angulo_estercamento,
            acelerometro_x, acelerometro_y, acelerometro_z
          ) VALUES (
            NOW(), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17,
            $18, $19, $20
          )`,
          [
            tensao_bateria, temperatura_bateria, temp_freio_traseiro,
            pressao_freio_traseira, pressao_freio_dianteiro, temp_freio_dianteiro,
            rpm_motor, nivel_combustivel, velocidade_eixo_traseiro,
            velocidade_dianteiro_esq, velocidade_dianteiro_dir,
            temp_oleo_caixa, temp_cvt, pressao_cvt,
            curso_pedal_acelerador, curso_pedal_freio, angulo_estercamento,
            acelerometro_x, acelerometro_y, acelerometro_z
          ]
        );

        console.log('📊 Novo dado de telemetria recebido e salvo!');

      } catch (error) {
        console.error('❌ Erro ao processar mensagem MQTT ou salvar no banco:', error);
      }
    }
  });
   
  // O que fazer quando a biblioteca tenta reconectar
  client.on('reconnect', () => {
    console.log('🟠 Tentando reconectar ao broker MQTT...');
  });

  // O que fazer quando a conexão é fechada
  client.on('close', () => {
    console.log('🔌 Conexão MQTT fechada.');
  });

  // O que fazer se o cliente ficar offline
  client.on('offline', () => {
    console.log('⚫ Cliente MQTT está offline.');
  });

  


  client.on('error', (error) => {
    console.error('❌ Erro no cliente MQTT:', error);
  });
};

export { client as mqttClient };
