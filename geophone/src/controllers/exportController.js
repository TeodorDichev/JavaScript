import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { pool } from '../db.js';
import { phoneModel } from '../models/phoneModel.js';

async function getExportData() {
    const client = await pool.connect();
    try {
        return await phoneModel.getAllWithCountries(client);
    } finally {
        client.release();
    }
}

export async function exportToCsv(req, res) {
    try {
        const data = await getExportData();
        const json2csvParser = new Parser({
            fields: [
                { label: 'Phone', value: 'phone_number' },
                { label: 'Code', value: 'phone_code' },
                { label: 'Country', value: 'country_name' }
            ]
        });
        
        const csv = json2csvParser.parse(data);

        res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename=phones.csv'
        });
        res.write('\ufeff'); 
        res.end(csv);
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'CSV error' }));
    }
}

export async function exportToExcel(req, res) {
    try {
        const data = await getExportData();
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data');

        sheet.columns = [
            { header: 'Phone', key: 'phone_number' },
            { header: 'Code', key: 'phone_code' },
            { header: 'Country', key: 'country_name' }
        ];

        sheet.addRows(data);

        res.writeHead(200, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=phones.xlsx'
        });
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Excel error' }));
    }
}

export async function exportToPdf(req, res) {
    const client = await pool.connect();
    const doc = new PDFDocument();

    try {
        const data = await phoneModel.getAllWithCountries(client);

        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=phones.pdf'
        });

        doc.pipe(res);

        doc.fontSize(18).text('Phone List', { underline: true });
        doc.moveDown();

        data.forEach(p => {
            const line = `${p.phone_number} (${p.phone_code}) - ${p.country_name || 'N/A'}`;
            doc.fontSize(12).text(line);
        });

        doc.end();
    } catch (err) {
        console.error(err);
        doc.end();
        res.status(500).send('Error generating PDF');
    } finally {
        client.release();
    }
}