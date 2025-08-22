import { Request, Response } from 'express';
import pool from '../db';
// Importa nosso cliente MQTT e o tópico de comandos do serviço
import { mqttClient, commandTopic } from '../services/mqttService';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

// --- Funções para a API de Telemetria ---

// Função para buscar os dados de telemetria de um período histórico
export const getHistoricalData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Datas de início e fim são obrigatórias.' });
    }
    const query = `
      SELECT *
      FROM telemetry_data
      WHERE "time" BETWEEN $1 AND $2
      ORDER BY "time" ASC;
    `;
    const result = await pool.query(query, [startDate, endDate]);
    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Nenhum dado encontrado para o período.' });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar dados históricos:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Função para buscar a leitura de telemetria mais recente
export const getLatestData = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT *
            FROM telemetry_data
            ORDER BY "time" DESC
            LIMIT 1;
        `;
        const result = await pool.query(query);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Nenhum dado encontrado.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Erro ao buscar o último dado:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// --- NOVA FUNÇÃO ---
// Função para chamar o piloto para o box
export const callDriverToBox = async (req: Request, res: Response) => {
  try {
    // A mensagem que enviaremos para o carro
    const message = {
      command: 'PIT',
      timestamp: new Date().toISOString(),
    };
    
    // Usamos o cliente MQTT exportado para publicar a mensagem no tópico de comandos
    mqttClient.publish(commandTopic, JSON.stringify(message), (error) => {
      if (error) {
        // Se a publicação falhar, lançamos um erro para o bloco catch
        throw new Error('Erro ao publicar mensagem MQTT.');
      }
    });

    console.log(`📢 Comando "PIT" enviado para o tópico: "${commandTopic}"`);
    res.status(200).json({ message: 'Comando para chamar ao box enviado com sucesso.' });

  } catch (error) {
    console.error('❌ Erro ao enviar comando para o box:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Funcao para exportar os dados de telemetria em um formato específico (CSV, PDF)
export const exportData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format } = req.query;

    if (!startDate || !endDate || !format) {
      return res.status(400).json({ message: 'Datas de início, fim e o formato são obrigatórios.' });
    }

    const query = `
      SELECT *
      FROM telemetry_data
      WHERE "time" BETWEEN $1 AND $2
      ORDER BY "time" ASC;
    `;
    const result = await pool.query(query, [startDate, endDate]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhum dado encontrado para exportar no período.' });
    }
    const data = result.rows;

    // 2. Lógica para CSV (que já funcionou)
    if (format === 'csv') {
      const fields = ['time', 'rpm', 'velocity', 'temperature', 'battery_level'];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('telemetria-imperador.csv');
      return res.status(200).send(csv);
    } 
    
    // 3.LÓGICA PARA PDF
    else if (format === 'pdf') {
        const doc = new PDFDocument();
        const filename = 'telemetria-imperador.pdf';

        // Configura os cabeçalhos para o navegador entender que é um PDF
        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Conecta o documento PDF à resposta HTTP (streaming)
        doc.pipe(res);

        // Adiciona um título ao documento
        doc.fontSize(16).text('Relatório de Telemetria - Equipe Imperador', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Período: de ${startDate} até ${endDate}`);
        doc.moveDown();

        // Adiciona uma tabela simples com os dados (exemplo básico)
        doc.fontSize(10);
        doc.text('Tempo | RPM | Velocidade | Temperatura | Bateria');
        doc.text('--------------------------------------------------');
        
        // Loop para adicionar cada linha de dados
        data.forEach(row => {
            const rowText = `${row.time.toISOString().slice(0, 19)} | ${row.rpm} | ${row.velocity} | ${row.temperature} | ${row.battery_level}`;
            doc.text(rowText);
        });

        // Finaliza o documento
        doc.end();
        return;
    }
    
    return res.status(400).json({ message: 'Formato de exportação inválido.' });

  } catch (error) {
    console.error('❌ Erro ao exportar dados:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};