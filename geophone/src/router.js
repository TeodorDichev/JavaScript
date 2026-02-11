import { handleStaticFile } from './controllers/staticController.js';
import { uploadCountries, uploadPhones } from './controllers/uploadController.js';
import { getIndexTableData, getChartData } from './controllers/dataController.js';
import { exportToCsv, exportToPdf, exportToExcel } from './controllers/exportController.js';

export async function router(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method;

    if (url.pathname === '/api/index' && method === 'GET') {
        return getIndexTableData(req, res);
    }
    if (url.pathname === '/api/chart' && method === 'GET') {
        return getChartData(req, res);
    }

    if (url.pathname === '/api/countries/upload' && method === 'POST') {
        return uploadCountries(req, res);
    }
    if (url.pathname === '/api/phones/upload' && method === 'POST') {
        return uploadPhones(req, res);
    }

    if (url.pathname.startsWith('/api/export/csv') && method === 'GET') {
        return exportToCsv(req, res, url);
    }
    if (url.pathname.startsWith('/api/export/pdf') && method === 'GET') {
        return exportToPdf(req, res, url);
    }
    if (url.pathname.startsWith('/api/export/excel') && method === 'GET') {
        return exportToExcel(req, res, url);
    }

    return handleStaticFile(req, res, url);
}