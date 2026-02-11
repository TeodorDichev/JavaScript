/**
 * Data access for Text-related queries.
 */
export const textModel = {
  /**
   * Returns the total count of text entries in the database.
   */
  getCount: async (client) => {
    const res = await client.query(`SELECT COUNT(*) AS count FROM TEXT`);
    return res.rows[0].count;
  },

  /**
   * Calculates the sum of all unique words across all processed texts.
   */
  getUniqueWordsSum: async (client) => {
    const res = await client.query(`
      SELECT SUM(UNIQUE_WORDS_COUNT) AS total 
      FROM TEXT 
      WHERE UNIQUE_WORDS_COUNT IS NOT NULL
    `);
    return res.rows[0].total;
  },

  /**
   * Fetches latest texts with their respective author names.
   */
  getTexts: async (client) => {
    const res = await client.query(`
      SELECT t.TEXT_ID, t.TITLE, t.UNIQUE_WORDS_COUNT, a.AUTHOR_NAME
      FROM TEXT t
      LEFT JOIN AUTHOR a ON t.AUTHOR_ID = a.AUTHOR_ID
      ORDER BY t.UNIQUE_WORDS_COUNT ASC
    `);
    return res.rows;
  },

  /**
   * Retrieves all texts belonging to a specific author.
   */
  getTextsByAuthorId: async (client, authorId) => {
    const res = await client.query(
      `SELECT TEXT_ID, TITLE, UNIQUE_WORDS_COUNT 
       FROM TEXT 
       WHERE AUTHOR_ID = $1`,
      [authorId]
    );
    return res.rows;
  },

  /**
   * Updates statistics for a specific text after file analysis.
   */
  updateTextStats: async (client, textId, uniqueCount) => {
    await client.query(
      `UPDATE TEXT 
       SET UNIQUE_WORDS_COUNT = $1,
           LAST_DATE_OF_UPDATE = CURRENT_DATE
       WHERE TEXT_ID = $2`,
      [uniqueCount, textId]
    );
  },

  /**
   * Ensures a text record exists in the database.
   */
  ensureText: async (client, { id, title, authorId }) => {
    await client.query(
      `INSERT INTO TEXT (TEXT_ID, TITLE, AUTHOR_ID)
         VALUES ($1, $2, $3)
         ON CONFLICT (TEXT_ID) DO UPDATE SET 
            TITLE = EXCLUDED.TITLE,
            AUTHOR_ID = EXCLUDED.AUTHOR_ID`,
      [id, title, authorId]
    );
  },
};
