import express from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import router from './routes/index.js';

dotenv.config({path: '.../.env'});

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT)
});

const app = express();
app.use(express.json());

app.use('/api', router);

const port = Number(process.env.APP_PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
