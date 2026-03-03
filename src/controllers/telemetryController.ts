import { Request, Response } from 'express';
import pool from '../db';
import { mqttClient, commandTopic } from '../services/mqttService';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

let pitActive = false;

/**
 * Busca dados de telemetria de um período histórico.
 */
export const getHistoricalData = async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Datas de início e fim são obrigatórias.' });
    }

    const query = `
      SELECT * FROM telemetry_data_v2 
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

/**
 * Busca a leitura de telemetria mais recente.
 * Implementa trava de 10 segundos para evitar exibição de dados "fantasmas" com carro desligado.
 */
export const getLatestData = async (req: Request, res: Response) => {
    try {
        const query = 'SELECT * FROM telemetry_data_v2 ORDER BY "time" DESC LIMIT 1;';
        const result = await pool.query(query);

        if (result.rows.length > 0) {
          const lastData = result.rows[0];
          const lastUpdate = new Date(lastData.time).getTime();
          const now = new Date().getTime();
          
          // Se o dado for mais velho que 10 segundos, consideramos o carro "Offline"
          if (now - lastUpdate > 10000) {
            return res.status(200).json(getZeroedData());
          }

          return res.status(200).json(lastData);
        } else {
          return res.status(200).json(getZeroedData());
        }
    } catch (error) {
        console.error('❌ Erro ao buscar o último dado:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

/**
 * Função auxiliar para retornar o estado zerado com as novas siglas do ESP32
 */
const getZeroedData = () => ({
    rpm: 0,
    vel: 0,
    tCVT: 0,
    vBat: 0,
    tBat: 0,
    pDiant: 0,
    pTras: 0,
    pCM: 0,
    vLF: 0,
    vRF: 0,
    perT: 0,
    perF: 0,
    pedF: 0,
    accX: 0,
    accY: 0,
    accZ: 0,
    dif: 0,
    time: new Date().toISOString()
});

/**
 * Alterna entre comando PIT e PISTA via MQTT
 */
export const callDriverToBox = async (req: Request, res: Response) => {
  try {
    pitActive = !pitActive;
    const command = pitActive ? "PIT" : "PISTA";

    const message = {
      command,
      timestamp: new Date().toISOString(),
    };

    mqttClient.publish(commandTopic, JSON.stringify(message), (error) => {
      if (error) throw new Error("Erro ao publicar mensagem MQTT.");
    });

    res.status(200).json({
      message: `Comando "${command}" enviado com sucesso.`,
      active: pitActive,
      timestamp: message.timestamp,
    });
  } catch (error) {
    console.error("❌ Erro ao enviar comando para o box:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

/**
 * Exporta dados em CSV ou PDF
 */
export const exportData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format } = req.query as { startDate: string, endDate: string, format: string };

    if (!startDate || !endDate || !format) {
      return res.status(400).json({ message: 'Parâmetros insuficientes.' });
    }

    const query = 'SELECT * FROM telemetry_data_v2 WHERE "time" BETWEEN $1 AND $2 ORDER BY "time" ASC;';
    const result = await pool.query(query, [startDate, endDate]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sem dados no período.' });
    }

    const data = result.rows;

    if (format === 'csv') {
      const fields = Object.keys(data[0]);
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('telemetria-imperador.csv');
      return res.status(200).send(csv);
    } 
    
    if (format === 'pdf') {
        const doc = new PDFDocument({size: 'A4', layout: 'landscape'});
        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', 'attachment; filename="telemetria.pdf"');
        
        doc.pipe(res);
        doc.fontSize(16).text('Relatório de Telemetria - Equipe Imperador', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Período: ${startDate} - ${endDate}`);
        doc.moveDown();

        const headers = Object.keys(data[0]);
        doc.fontSize(7).text(headers.join(' | '));
        doc.text('-'.repeat(160));

        data.slice(0, 500).forEach(row => { // Limite de 500 linhas no PDF para não travar
          const rowValues = headers.map(h => {
              const val = row[h];
              return val instanceof Date ? val.toLocaleTimeString() : val;
          });
          doc.text(rowValues.join(' | '));
        });

        doc.end();
        return;
    }
    
    return res.status(400).json({ message: 'Formato inválido.' });
  } catch (error) {
    console.error('❌ Erro ao exportar:', error);
    res.status(500).json({ message: 'Erro interno.' });
  }
};