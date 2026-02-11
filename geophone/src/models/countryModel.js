
export const countryModel = {
    async createAll(client, countriesArray) {
        if (countriesArray.length === 0) return;

        const values = [];
        const placeholders = countriesArray.map((_, i) => {
            const offset = i * 6;
            const d = countriesArray[i];
            values.push(d.name, d.iso_code, d.phone_code, d.population, d.area, d.gdp_usd);
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
        }).join(', ');

        const sql = `
            INSERT INTO countries (name, iso_code, phone_code, population, area, gdp_usd) 
            VALUES ${placeholders}
        `;
        
        return client.query(sql, values);
    },

    async getAllCodes(client) {
        const res = await client.query(`SELECT id, phone_code FROM countries ORDER BY LENGTH(phone_code) DESC`);
        return res.rows;
    },

    async getCountryPhoneCount(client) {
        const res = await client.query(`
            SELECT c.name as country_name, COUNT(p.id) as count
            FROM countries c
            JOIN phone_numbers p ON c.id = p.country_id
            GROUP BY c.name
            ORDER BY count DESC;
        `);

        return res.rows;
    }
};