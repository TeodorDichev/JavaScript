/**
 * Data access for Author-related queries.
 */
export const authorModel = {
  /**
   * Returns the total count of distinct authors present in the library.
   */
  getTotalCount: async (client) => {
    const res = await client.query(`
      SELECT COUNT(DISTINCT AUTHOR_ID) AS count 
      FROM TEXT 
      WHERE AUTHOR_ID IS NOT NULL
    `);
    return res.rows[0].count;
  },

  /**
   * Returns the count of authors whose texts have already been processed.
   */
  getProcessedCount: async (client) => {
    const res = await client.query(`
      SELECT COUNT(DISTINCT AUTHOR_ID) AS count 
      FROM TEXT 
      WHERE AUTHOR_ID IN (
        SELECT AUTHOR_ID FROM AUTHOR WHERE UNIQUE_WORDS_COUNT IS NOT NULL
      )`);
    return res.rows[0].count;
  },

  /**
   * Fetches authors for the background processing task (FileProcessor).
   * Selects authors not updated today.
   */
  getAuthorsForProcessing: async (client) => {
    const res = await client.query(`
      SELECT DISTINCT a.AUTHOR_ID, c.COUNTRY_NAME 
      FROM AUTHOR a
      JOIN TEXT t ON a.AUTHOR_ID = t.AUTHOR_ID
      LEFT JOIN COUNTRY c ON a.COUNTRY_ID = c.COUNTRY_ID
      WHERE a.LAST_DATE_OF_UPDATE IS DISTINCT FROM CURRENT_DATE
    `);
    return res.rows;
  },

  /**
   * Updates aggregated statistics for an author.
   */
  updateAuthorStats: async (client, authorId, stats) => {
    const { avgWords, uniqueWords, maxSentence } = stats;
    await client.query(
      `UPDATE AUTHOR
       SET WORDS_PER_SENTENCE_COUNT = $1,
           UNIQUE_WORDS_COUNT = $2,
           LONGEST_SENTENSE_WORDS_COUNT = $3,
           LAST_DATE_OF_UPDATE = CURRENT_DATE
       WHERE AUTHOR_ID = $4`,
      [avgWords, uniqueWords, maxSentence, authorId]
    );
  },

  /**
   * Fetches the top authors based on unique word count.
   */
  getTopByUniqueWords: async (client) => {
    const res = await client.query(`
      SELECT *
      FROM AUTHOR
      ORDER BY UNIQUE_WORDS_COUNT DESC NULLS LAST
    `);
    return res.rows;
  },

  /**
   * Gets all fields from AUTHOR table plus the COUNTRY_NAME.
   */
  getById: async (client, authorId) => {
    const res = await client.query(
      `
        SELECT 
            A.AUTHOR_ID,
            A.AUTHOR_NAME,
            A.AUTHOR_ORIGINAL_NAME,
            A.UNIQUE_WORDS_COUNT,
            A.WORDS_PER_SENTENCE_COUNT,
            A.LONGEST_SENTENSE_WORDS_COUNT,
            A.LAST_DATE_OF_UPDATE,
            C.COUNTRY_NAME
        FROM AUTHOR A
        LEFT JOIN COUNTRY C ON A.COUNTRY_ID = C.COUNTRY_ID
        WHERE A.AUTHOR_ID = $1
    `,
      [authorId]
    );

    return res.rows[0];
  },

  /**
   * Ensures a country exists and returns its ID.
   */
  ensureCountry: async (client, countryName) => {
    if (!countryName) return null;
    const res = await client.query(
      `INSERT INTO COUNTRY (COUNTRY_NAME) 
         VALUES ($1) 
         ON CONFLICT (COUNTRY_NAME) DO UPDATE SET COUNTRY_NAME = EXCLUDED.COUNTRY_NAME
         RETURNING COUNTRY_ID`,
      [countryName]
    );
    return res.rows[0].country_id;
  },

  /**
   * Ensures an author exists in the database.
   */
  ensureAuthor: async (client, { id, name, originalName, countryId }) => {
    await client.query(
      `INSERT INTO AUTHOR (AUTHOR_ID, AUTHOR_NAME, AUTHOR_ORIGINAL_NAME, COUNTRY_ID)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (AUTHOR_ID) DO UPDATE SET 
            AUTHOR_NAME = EXCLUDED.AUTHOR_NAME,
            AUTHOR_ORIGINAL_NAME = EXCLUDED.AUTHOR_ORIGINAL_NAME,
            COUNTRY_ID = EXCLUDED.COUNTRY_ID`,
      [id, name, originalName, countryId]
    );
  },
};
