/**
 * @fileoverview Model for administrative validation queries.
 * Provides methods to check existence and integrity constraints across 
 * regions, municipalities, mayoralties, and settlements.
 */

export const validationModel = {
    /**
     * Checks if a Mayorality exists with the given ID.
     * @param {pg.Client} client - Database client.
     * @param {string} id - Mayorality ID.
     * @returns {Promise<pg.QueryResult>}
     */
    async existsMayorality(client, id) {
        const query = {
            text: `SELECT 1 FROM mayorality WHERE mayorality_id = $1`,
            values: [id],
        };
        return await client.query(query);
    },

    /**
     * Checks if a Settlement exists with the given EKATTE code.
     * @param {pg.Client} client - Database client.
     * @param {string} ekatte - Settlement EKATTE code.
     * @returns {Promise<pg.QueryResult>}
     */
    async existsSettlement(client, ekatte) {
        const query = {
            text: `SELECT 1 FROM settlement WHERE ekatte = $1`,
            values: [ekatte],
        };
        return await client.query(query);
    },

    /**
     * Checks if a Region exists with the given ID.
     * @param {pg.Client} client - Database client.
     * @param {string} id - Region ID.
     * @returns {Promise<pg.QueryResult>}
     */
    async existsRegion(client, id) {
        const query = {
            text: `SELECT 1 FROM region WHERE region_id = $1`,
            values: [id]
        };
        return await client.query(query);
    },

    /**
     * Checks if a Region exists with the given NUTS3 ID.
     * @param {pg.Client} client - Database client.
     * @param {string} nuts - NUTS3 ID.
     * @returns {Promise<pg.QueryResult>}
     */
    async existsRegionByNuts(client, nuts) {
        const query = {
            text: `SELECT 1 FROM region WHERE nuts3_id = $1`,
            values: [nuts]
        };
        return await client.query(query);
    },

    /**
     * Checks if a Municipality exists with the given ID.
     * @param {pg.Client} client - Database client.
     * @param {string} id - Municipality ID.
     * @returns {Promise<pg.QueryResult>}
     */
    async existsMunicipality(client, id) {
        const query = {
            text: `SELECT 1 FROM municipality WHERE municipality_id = $1`,
            values: [id]
        };
        return await client.query(query);
    },

    /**
     * Finds settlements within a municipality that serve as region centers.
     * Used for dependency checks before administrative changes.
     * @param {pg.Client} client - Database client.
     * @param {string} municipalityId - Municipality ID.
     * @returns {Promise<pg.QueryResult>}
     */
    async getRegionCentersInMunicipality(client, municipalityId) {
        const query = {
            text: `
                SELECT 
                    s.NAME AS settlement_name, 
                    r.NAME AS region_name
                FROM SETTLEMENT s
                JOIN REGION_CENTER rc ON s.EKATTE = rc.SETTLEMENT_EKATTE
                JOIN REGION r ON rc.REGION_ID = r.REGION_ID
                WHERE s.MUNICIPALITY_ID = $1
            `,
            values: [municipalityId]
        };
        return await client.query(query);
    },

    /**
     * Checks all administrative units (Region, Municipality, Mayorality) 
     * where a specific settlement serves as a center.
     * @param {pg.Client} client - Database client.
     * @param {string} ekatte - Settlement EKATTE code.
     * @returns {Promise<pg.QueryResult>}
     */
    async getAffectedUnitsBySettlement(client, ekatte) {
        const query = {
            text: `
                SELECT 'Област ' || r.NAME as affected_name
                FROM REGION_CENTER rc
                JOIN REGION r ON rc.REGION_ID = r.REGION_ID
                WHERE rc.SETTLEMENT_EKATTE = $1
                UNION ALL
                SELECT 'Община ' || m.NAME
                FROM MUNICIPALITY_CENTER mc
                JOIN MUNICIPALITY m ON mc.MUNICIPALITY_ID = m.MUNICIPALITY_ID
                WHERE mc.SETTLEMENT_EKATTE = $1
                UNION ALL
                SELECT 'Кметство ' || may.NAME
                FROM MAYORALITY_CENTER mayc
                JOIN MAYORALITY may ON mayc.MAYORALITY_ID = may.MAYORALITY_ID
                WHERE mayc.SETTLEMENT_EKATTE = $1
            `,
            values: [ekatte]
        };
        return await client.query(query);
    },

    /**
     * Identifies settlements within a mayorality that serve as Municipality or Region centers.
     * @param {pg.Client} client - Database client.
     * @param {string} mayoralityId - Mayorality ID.
     * @returns {Promise<pg.QueryResult>}
     */
    async getAffectedCentersByMayorality(client, mayoralityId) {
        const query = {
            text: `
                SELECT 
                    s.NAME || ' (Център на Област ' || r.NAME || ')' as affected_info
                FROM SETTLEMENT s
                JOIN REGION_CENTER rc ON s.EKATTE = rc.SETTLEMENT_EKATTE
                JOIN REGION r ON rc.REGION_ID = r.REGION_ID
                WHERE s.MAYORALITY_ID = $1
                UNION ALL
                SELECT 
                    s.NAME || ' (Център на Община ' || m.NAME || ')'
                FROM SETTLEMENT s
                JOIN MUNICIPALITY_CENTER mc ON s.EKATTE = mc.SETTLEMENT_EKATTE
                JOIN MUNICIPALITY m ON mc.MUNICIPALITY_ID = m.MUNICIPALITY_ID
                WHERE s.MAYORALITY_ID = $1
            `,
            values: [mayoralityId]
        };
        return await client.query(query);
    }
};
