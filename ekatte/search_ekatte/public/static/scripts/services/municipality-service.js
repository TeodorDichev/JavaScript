import { apiRequest } from "../utils/api-client.js";

export const MunicipalityService = {
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

    return await apiRequest(`/municipality/home?${params.toString()}`);
  },

  async getInfo(id) {
    return await apiRequest(`/municipality/info?q=${encodeURIComponent(id)}`);
  },

  async create(body) {
    return await apiRequest("/municipality/create", "POST", body);
  },

  async update(id, body) {
    return await apiRequest(`/municipality/update/${id}`, "PUT", body);
  },

  async delete(id) {
    return await apiRequest(
      `/municipality/delete?id=${encodeURIComponent(id)}`,
      "DELETE"
    );
  },

  async validateEkatte(q) {
    return await apiRequest(`/validation/ekatte?q=${encodeURIComponent(q)}`);
  },

  async validateMunicipalityCode(q) {
    return await apiRequest(
      `/validation/municipality-code?q=${encodeURIComponent(q)}`
    );
  },

  async validateMayoralityCode(q) {
    return await apiRequest(
      `/validation/mayorality-code?q=${encodeURIComponent(q)}`
    );
  },

  async checkDependencies(id) {
    return await apiRequest(
      `/validation/municipality-dependencies?id=${encodeURIComponent(id)}`
    );
  },

  async getExcelExport(
    query = "",
    sort = "",
    fromDate = "",
    toDate = "",
    filters = {}
  ) {
    const params = new URLSearchParams({
      q: query.trim(),
      sort: sort,
      fromDate: fromDate,
      toDate: toDate,
      ...filters,
    });

    return await apiRequest(`/municipality/excel-export?${params.toString()}`);
  },

  async getCsvExport(
    query = "",
    sort = "",
    fromDate = "",
    toDate = "",
    filters = {}
  ) {
    const params = new URLSearchParams({
      q: query.trim(),
      sort: sort,
      fromDate: fromDate,
      toDate: toDate,
      ...filters,
    });

    return await apiRequest(`/municipality/csv-export?${params.toString()}`);
  },
};
