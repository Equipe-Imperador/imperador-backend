import { Request, Response } from 'express';
import pool from '../db';
import { mqttClient, commandTopic } from '../services/mqttService';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

let pitActive = false;

export const getHistoricalData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { startDate: string, endDate: string };
    if (!startDate || !endDate) return res.status(400).json({ message: 'Datas obrigatórias.' });

    const query = 'SELECT * FROM telemetry_data_v2 WHERE "time" BETWEEN $1 AND $2 ORDER BY "time" ASC;';
    const result = await pool.query(query, [startDate, endDate]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

export const getLatestData = async (req: Request, res: Response) => {
  try {
    const query = 'SELECT * FROM telemetry_data_v2 ORDER BY "time" DESC LIMIT 1;';
    const result = await pool.query(query);

    if (result.rows.length > 0) {
      const lastData = result.rows[0];
      const lastUpdate = new Date(lastData.time).getTime();
      const now = new Date().getTime();
      const isOld = (now - lastUpdate > 10000);

      return res.status(200).json({ ...lastData, isOld });
    } 
    return res.status(200).json({ isOld: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

export const callDriverToBox = async (req: Request, res: Response) => {
  try {
    pitActive = !pitActive;
    const command = pitActive ? "PIT" : "PISTA";
    mqttClient.publish(commandTopic, JSON.stringify({ command, timestamp: new Date().toISOString() }));
    res.status(200).json({ message: `Comando ${command} enviado.`, active: pitActive });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao enviar comando.' });
  }
};

export const exportData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format } = req.query as { startDate: string, endDate: string, format: string };
    const result = await pool.query('SELECT * FROM telemetry_data_v2 WHERE "time" BETWEEN $1 AND $2 ORDER BY "time" ASC;', [startDate, endDate]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Sem dados.' });

    if (format === 'csv') {
      const csv = new Parser({ fields: Object.keys(result.rows[0]) }).parse(result.rows);
      res.header('Content-Type', 'text/csv').attachment('telemetria.csv').send(csv);
    } else if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
      res.header('Content-Type', 'application/pdf').attachment('telemetria.pdf');
      doc.pipe(res);
      doc.fontSize(16).text('Relatório Telemetria - Imperador', { align: 'center' }).moveDown();
      const headers = Object.keys(result.rows[0]);
      doc.fontSize(7).text(headers.join(' | ')).text('-'.repeat(160));
      result.rows.slice(0, 500).forEach(row => {
        const vals = headers.map(h => row[h] instanceof Date ? row[h].toLocaleTimeString() : row[h]);
        doc.text(vals.join(' | '));
      });
      doc.end();
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro na exportação.' });
  }
};