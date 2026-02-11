export const phoneModel = {
    async createAll(client, phoneDataArray) {
        if (phoneDataArray.length === 0) return;

        const values = [];
        const placeholders = phoneDataArray.map((_, i) => {
            const offset = i * 2;
            values.push(phoneDataArray[i].phone, phoneDataArray[i].countryId);
            return `($${offset + 1}, $${offset + 2})`;
        }).join(', ');

        const sql = `INSERT INTO phone_numbers (phone_number, country_id) VALUES ${placeholders} `;
        
        return client.query(sql, values);
    },

    async getAllWithCountries(client) {
        const sql = `
            SELECT p.phone_number, c.phone_code, c.name as country_name
            FROM phone_numbers p
            LEFT JOIN countries c ON p.country_id = c.id
            ORDER BY c.name ASC NULLS LAST`;
        const res = await client.query(sql);
        return res.rows;
    }
};