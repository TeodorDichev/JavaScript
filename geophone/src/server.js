import http from 'http';
import 'dotenv/config';
import { router } from './router.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    try {
        await router(req, res);
    } catch (err) {
        console.error('[Server Error]:', err);
        if (!res.writableEnded) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    }
});

server.listen(PORT, () => {
    console.log(`Geophone Server running at http://localhost:${PORT}`);
});