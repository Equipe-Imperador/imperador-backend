import { Request, Response } from 'express';
import pool from '../db';
import { mqttClient, commandTopic } from '../services/mqttService';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

/**
 * Busca dados de telemetria de um período histórico.
 * Espera 'startDate' e 'endDate' como query params.
 */
export const getHistoricalData = async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Datas de início e fim são obrigatórias.' });
    }

    const query = `
      SELECT * FROM telemetry_data 
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
 * Se a tabela estiver vazia, retorna um objeto com todos os valores zerados.
 */
export const getLatestData = async (req: Request, res: Response) => {
    try {
        const query = 'SELECT * FROM telemetry_data ORDER BY "time" DESC LIMIT 1;';
        const result = await pool.query(query);

        if (result.rows.length > 0) {
          return res.status(200).json(result.rows[0]);
        } else {
          // Retorna um objeto zerado com os novos nomes de colunas
          return res.status(200).json({
            tensao_bateria: 0,
            temperatura_bateria: 0,
            temp_freio_traseiro: 0,
            pressao_freio_traseira: 0,
            pressao_freio_dianteiro: 0,
            temp_freio_dianteiro: 0,
            rpm_motor: 0,
            nivel_combustivel: 0,
            velocidade_eixo_traseiro: 0,
            velocidade_dianteiro_esq: 0,
            velocidade_dianteiro_dir: 0,
            temp_oleo_caixa: 0,
            temp_cvt: 0,
            pressao_cvt: 0,
            curso_pedal_acelerador: 0,
            curso_pedal_freio: 0,
            angulo_estercamento: 0,
            acelerometro_x: 0,
            acelerometro_y: 0,
            acelerometro_z: 0
          });
        }
    } catch (error) {
        console.error('❌ Erro ao buscar o último dado:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

/**
 * Envia um comando 'PIT' para o tópico MQTT de comandos.
 */
export const callDriverToBox = async (req: Request, res: Response) => {
  try {
    const message = {
      command: 'PIT',
      timestamp: new Date().toISOString(),
    };
    
    mqttClient.publish(commandTopic, JSON.stringify(message), (error) => {
      if (error) {
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

/**
 * Exporta dados de telemetria em formato CSV ou PDF.
 * Espera 'startDate', 'endDate' e 'format' como query params.
 */
export const exportData = async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const format = req.query.format as string;

    if (!startDate || !endDate || !format) {
      return res.status(400).json({ message: 'Datas de início, fim e o formato são obrigatórios.' });
    }

    const query = `
      SELECT * FROM telemetry_data 
      WHERE "time" BETWEEN $1 AND $2 
      ORDER BY "time" ASC;
    `;
    const result = await pool.query(query, [startDate, endDate]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhum dado encontrado para exportar no período.' });
    }
    const data = result.rows;

    if (format === 'csv') {
      const fields = Object.keys(data[0]); // Pega os cabeçalhos dinamicamente do primeiro objeto
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('telemetria-imperador.csv');
      return res.status(200).send(csv);
    } 
    
    else if (format === 'pdf') {
        const doc = new PDFDocument({size: 'A4', layout: 'landscape'});
        const filename = 'telemetria-imperador.pdf';

        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        
        doc.pipe(res);
        doc.fontSize(16).text('Relatório de Telemetria - Equipe Imperador', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Período: de ${startDate} até ${endDate}`);
        doc.moveDown(2);

        // Cabeçalhos da Tabela
        doc.fontSize(8);
        const headers = Object.keys(data[0]);
        doc.text(headers.join(' | ')); // Simplesmente junta os cabeçalhos
        doc.text('------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------');

        // Linhas de Dados
        data.forEach(row => {
          const rowValues = headers.map(header => {
              const value = row[header];
              if (value instanceof Date) return value.toLocaleTimeString();
              if (typeof value === 'number') return value.toFixed(2);
              return value;
          });
          doc.text(rowValues.join(' | '));
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
