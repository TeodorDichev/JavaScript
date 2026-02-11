import { pool } from "../db.js";
import { phoneModel } from "../models/phoneModel.js";
import { countryModel } from "../models/countryModel.js";

export async function getIndexTableData(req, res) {
  const client = await pool.connect();

  try {
    const data = await phoneModel.getAllWithCountries(client);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Data fetch failed" }));
  } finally {
    client.release();
  }
}

export async function getChartData(req, res) {
  const client = await pool.connect();
  
  try {
    const data = await countryModel.getCountryPhoneCount(client);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error(err);
    res.end(JSON.stringify({ error: "Data fetch failed" }));
  } finally {
    client.release();
  }
}
