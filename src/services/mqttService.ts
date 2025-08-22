import mqtt from 'mqtt';
import pool from '../db'; // Nosso pool de conexão com o PostgreSQL

// --- Configuração do Cliente MQTT ---
// TIRAMOS a criação do cliente para fora da função para que a variável 'client'
// possa ser exportada e usada em outras partes da nossa aplicação.
const brokerUrl = 'mqtt://broker.hivemq.com';
const client = mqtt.connect(brokerUrl);

// --- Tópicos ---
// Tópico para receber dados do carro
const telemetryTopic = 'imperador/telemetria';
// Tópico para enviar comandos para o carro (exportamos para usar no controlador)
export const commandTopic = 'imperador/comandos/box';


// --- Função Principal do Serviço ---
// Esta função configura os "ouvintes" de eventos (o que fazer quando conecta, recebe msg, etc.)
export const startMqttClient = () => {
  // Evento disparado quando a conexão com o broker é bem-sucedida
  client.on('connect', () => {
    console.log('✅ Conectado ao broker MQTT com sucesso!');
    
    // Se inscreve no tópico de telemetria para começar a receber as mensagens
    client.subscribe(telemetryTopic, (err) => {
      if (!err) {
        console.log(`📡 Inscrito no tópico: "${telemetryTopic}"`);
      }
    });
  });

  // Evento disparado toda vez que uma nova mensagem chega nos tópicos inscritos
  client.on('message', async (topic, message) => {
    // Garantimos que estamos processando apenas mensagens do tópico de telemetria
    if (topic === telemetryTopic) {
      try {
        const dataString = message.toString();
        const data = JSON.parse(dataString);
        
        console.log(`📩 Mensagem recebida do tópico "${topic}":`, data);

        const { rpm, velocity, temperature, battery_level } = data;

        await pool.query(
          'INSERT INTO telemetry_data (time, rpm, velocity, temperature, battery_level) VALUES (NOW(), $1, $2, $3, $4)',
          [rpm, velocity, temperature, battery_level]
        );
        
        console.log('📊 Novo dado de telemetria recebido e salvo!');

      } catch (error) {
        console.error('❌ Erro ao processar mensagem MQTT ou salvar no banco:', error);
      }
    }
  });

  // Evento para lidar com erros de conexão
  client.on('error', (error) => {
    console.error('❌ Erro no cliente MQTT:', error);
    client.end();
  });
};

// --- Exportação ---
// Exportamos a instância do cliente com um nome mais claro para que os controladores
// possam usá-la para publicar mensagens (ex: chamar o piloto para o box).
export { client as mqttClient };