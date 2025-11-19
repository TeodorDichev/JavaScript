import { Router } from "express";
import { pool } from "./server.js";

const router = Router();

router.get("/", async (req, res) => {
  const q = req.query.q.toLowerCase();

  try {
    const result = await pool.query(
      `
    SELECT 
        s.ekkate,
        s.name AS name,
        mu.name AS municipality,
        r.name AS region,
        p.name AS province
    FROM settlement s
    JOIN mayorality ma ON s.mayorality_id = ma.mayorality_id
    JOIN municipality mu ON ma.municipality_id = mu.municipality_id
    JOIN region r ON mu.region_id = r.region_id
    JOIN province p ON r.province_id = p.province_id
    WHERE 
          s.ekkate ILIKE '%' || $1 || '%'
       OR s.name ILIKE '%' || $1 || '%'
       OR mu.name ILIKE '%' || $1 || '%'
       OR r.name ILIKE '%' || $1 || '%'
       OR p.name ILIKE '%' || $1 || '%';
  `,
      [q]
    );

    res.json({
      count: result.rowCount,
      rows: result.rows,
    });
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;