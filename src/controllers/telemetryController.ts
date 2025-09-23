import { Request, Response } from 'express';
import pool from '../db';
// Importa nosso cliente MQTT e o tópico de comandos do serviço
import { mqttClient, commandTopic } from '../services/mqttService';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

// --- Funções para a API de Telemetria ---

// --- FUNÇÃO CORRIGIDA ---
export const getHistoricalData = async (req: Request, res: Response) => {
  try {
    // CONVERSÃO: Convertemos os parâmetros para string para resolver o erro do TypeScript
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

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
}

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
// --- FUNÇÃO CORRIGIDA ---
export const exportData = async (req: Request, res: Response) => {
  try {
    // CONVERSÃO: Convertemos os parâmetros para string
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const format = req.query.format as string;

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

    if (format === 'csv') {
      const fields = ['time', 'rpm', 'velocity', 'temperature', 'battery_level'];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('telemetria-imperador.csv');
      return res.status(200).send(csv);
    } 
    
    else if (format === 'pdf') {
        const doc = new PDFDocument();
        const filename = 'telemetria-imperador.pdf';

        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        
        doc.pipe(res);

        doc.fontSize(16).text('Relatório de Telemetria - Equipe Imperador', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Período: de ${startDate} até ${endDate}`);
        doc.moveDown();

        doc.fontSize(10);
        doc.text('Tempo | RPM | Velocidade | Temperatura | Bateria');
        doc.text('--------------------------------------------------');
        
        data.forEach(row => {
            const rowText = `${row.time.toISOString().slice(0, 19)} | ${row.rpm} | ${row.velocity} | ${row.temperature} | ${row.battery_level}`;
            doc.text(rowText);
        });

        doc.end();
        return;
    }
    
    return res.status(400).json({ message: 'Formato de exportação inválido.' });

  } catch (error) {
    console.error('❌ Erro ao exportar dados:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};