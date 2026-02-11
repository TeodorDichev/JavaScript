import { apiRequest, apiFileRequest } from "../utils/api-client.js";

export const MayoralityService = {
  async getHome(
    query = "",
    sort = "",
    page = 1,
    limit = 20,
    fromDate = "",
    toDate = "",
    filters = {}
  ) {
    const params = new URLSearchParams({
      q: query.trim(),
      sort: sort,
      page: page.toString(),
      limit: limit.toString(),
      fromDate: fromDate,
      toDate: toDate,
      ...filters,
    });

    return await apiRequest(`/mayorality/home?${params.toString()}`);
  },

  async getInfo(id) {
    return await apiRequest(`/mayorality/info?q=${encodeURIComponent(id)}`);
  },

  async create(body) {
    return await apiRequest("/mayorality/create", "POST", body);
  },

  async update(id, body) {
    return await apiRequest(`/mayorality/update/${id}`, "PUT", body);
  },

  async delete(id) {
    return await apiRequest(
      `/mayorality/delete?id=${encodeURIComponent(id)}`,
      "DELETE"
    );
  },

  async validateEkatte(q) {
    return await apiRequest(`/validation/ekatte?q=${encodeURIComponent(q)}`);
  },

  async validateMayoralityCode(q) {
    return await apiRequest(
      `/validation/mayorality-code?q=${encodeURIComponent(q)}`
    );
  },

  async checkDependencies(id) {
    return await apiRequest(
      `/validation/mayorality-dependencies?id=${encodeURIComponent(id)}`
    );
  },

  // If data streaming use apiFileRequest
  async getExcelExport({ query = "", sort = "", fromDate = "", toDate = "", filters = {} }) {
    const params = new URLSearchParams({
      q: query.trim(),
      sort: sort,
      fromDate: fromDate,
      toDate: toDate,
      ...filters,
    });

    return await apiRequest(`/mayorality/excel-export?${params.toString()}`);
  },

  async getCsvExport({ query = "", sort = "", fromDate = "", toDate = "", filters = {} }) {
    const params = new URLSearchParams({
      q: query.trim(),
      sort: sort,
      fromDate: fromDate,
      toDate: toDate,
      ...filters,
    });

    return await apiRequest(`/mayorality/csv-export?${params.toString()}`);
  },
};
