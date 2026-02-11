import dotenv from 'dotenv';
import http from "http";
import { Pool } from 'pg';
import { router } from './router.js';
import { ApiResponse } from './utils/api-response.js';

dotenv.config({path: '.env'});

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT)
});

const PORT = Number(process.env.APP_PORT) || 3000;

const server = http.createServer(async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:8000");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    await router(req, res);
  } catch (e) {
    console.error(e);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify(new ApiResponse.error("Вътрешна грешка", [e.message])));
  }
});


server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

