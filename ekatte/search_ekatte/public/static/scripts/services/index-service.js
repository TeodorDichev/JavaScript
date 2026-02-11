import { apiRequest } from '../utils/api-client.js';

export const IndexService = {
    async getHome(query = "", sort = "", page = 1, limit = 20) {
        const params = new URLSearchParams({
            q: query.trim(),
            sort: sort,
            page: page.toString(),
            limit: limit.toString()
        });

        return await apiRequest(`/home?${params.toString()}`);
    },

    async getCsvExport() {
        return await apiRequest(`/csv-export`);
    },

    async getExcelExport() {
        return await apiRequest(`/excel-export`);
    }
};