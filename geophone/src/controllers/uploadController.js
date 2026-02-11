import { parse } from "fast-csv";
import { pool } from "../db.js";
import { countryModel } from "../models/countryModel.js";
import { phoneModel } from "../models/phoneModel.js";

export async function uploadCountries(req, res) {
  const client = await pool.connect();
  let buffer = [];

  try {
    await client.query("BEGIN");

    const csvStream = req.pipe(
      parse({ headers: false, ignoreEmpty: true, trim: true })
    );

    for await (const row of csvStream) {
      const [name, iso_code, phone_code, population, area, gdp_usd] = row;
      const cleanPhoneCode = phone_code ? phone_code.replace(/\D/g, "") : "";

      try {
        if (
          !isValidCountryName(name) ||
          !iso_code ||
          !isValidPhoneCode(cleanPhoneCode)
        ) {
          console.warn("Skipping malformed country line:", row);
          continue;
        }

        buffer.push({
          name: name,
          iso_code: iso_code,
          phone_code: cleanPhoneCode,
          population: population
            ? parseInt(population.replace(/\D/g, ""))
            : null,
          area: area ? parseFloat(area) : null,
          gdp_usd: gdp_usd ? parseFloat(gdp_usd) : null,
        });
      } catch (lineError) {
        console.error("Line processing error:", lineError);
        continue;
      }
    }

    if (buffer.length > 0) {
      await countryModel.createAll(client, buffer);
    }

    await client.query("COMMIT");

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ success: true, message: "Държавите бяха импортирани." })
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Fatal Country Import Error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Фатална грешка при импорт на държави." }));
  } finally {
    client.release();
  }
}

export async function uploadPhones(req, res) {
  const client = await pool.connect();
  let phones = [];

  try {
    await client.query("BEGIN");
    const countries = await countryModel.getAllCodes(client);

    const csvStream = req.pipe(
      parse({ headers: false, ignoreEmpty: true, trim: true })
    );

    for await (const row of csvStream) {
      try {
        const phoneNumberRaw = row[0];
        const cleanPhone = phoneNumberRaw
          ? phoneNumberRaw.replace(/\D/g, "")
          : "";

        if (!isValidPhone(cleanPhone)) {
          console.warn("Skipping malformed phone number:", phoneNumberRaw);
          continue;
        }

        let foundCountryId = null;
        for (const country of countries) {
          if (cleanPhone.startsWith(country.phone_code)) {
            foundCountryId = country.id;
            break;
          }
        }

        // adding even phone when country is not found
        phones.push({ phone: cleanPhone, countryId: foundCountryId });
      } catch (lineError) {
        console.warn("Skipping bad line:", row, lineError.message);
        continue;
      }
    }

    if (phones.length > 0) {
      await phoneModel.createAll(client, phones);
    }

    await client.query("COMMIT");

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ success: true, message: "Импортът приключи успешно." })
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Fatal Phone Import Error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Фатална грешка при импорта." }));
  } finally {
    client.release();
  }
}
