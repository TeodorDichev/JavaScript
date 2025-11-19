import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import searchRouter from './routes/search.js';

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

app.use('/search', searchRouter);

dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT)
});

const port = Number(process.env.APP_PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
