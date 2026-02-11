import { apiRequest } from "../utils/api-client.js";

export const SettlementService = {
  async getHome(
    query = "",
    sort = "",
    page = 1,
    limit = 20,
    fromDate = "",
    toDate = "",
    filters = {},
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

    return await apiRequest(`/settlement/home?${params.toString()}`);
  },

  async getInfo(id) {
    return await apiRequest(`/settlement/info?q=${encodeURIComponent(id)}`);
  },

  async create(body) {
    return await apiRequest("/settlement/create", "POST", body);
  },

  async update(id, body) {
    return await apiRequest(`/settlement/update/${id}`, "PUT", body);
  },

  async delete(id) {
    return await apiRequest(
      `/settlement/delete?id=${encodeURIComponent(id)}`,
      "DELETE",
    );
  },

  async validateEkatte(ekatte) {
    return await apiRequest(
      `/validation/ekatte?q=${encodeURIComponent(ekatte.trim())}`,
    );
  },

  async checkDependencies(id) {
    return await apiRequest(
      `/validation/settlement-dependencies?id=${encodeURIComponent(id)}`,
    );
  },

  async getExcelExport(
    query = "",
    sort = "",
    fromDate = "",
    toDate = "",
    filters = {},
  ) {
    const params = new URLSearchParams({
      q: query.trim(),
      sort: sort,
      fromDate: fromDate,
      toDate: toDate,
      ...filters,
    });

    return await apiRequest(`/settlement/excel-export?${params.toString()}`);
  },

  async getCsvExport(
    query = "",
    sort = "",
    fromDate = "",
    toDate = "",
    filters = {},
  ) {
    const params = new URLSearchParams({
      q: query.trim(),
      sort: sort,
      fromDate: fromDate,
      toDate: toDate,
      ...filters,
    });

    return await apiRequest(`/settlement/csv-export?${params.toString()}`);
  },
};
