import { apiRequest } from "../utils/api-client.js";

export const RegionService = {
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

    return await apiRequest(`/region/home?${params.toString()}`);
  },

  async getInfo(id) {
    return await apiRequest(`/region/info?q=${encodeURIComponent(id)}`);
  },

  async update(id, body) {
    return await apiRequest(`/region/update/${id}`, "PUT", body);
  },

  async create(body) {
    return await apiRequest("/region/create", "POST", body);
  },

  async delete(id) {
    return await apiRequest(
      `/region/delete?id=${encodeURIComponent(id)}`,
      "DELETE"
    );
  },

  async validateEkatte(q) {
    return await apiRequest(`/validation/ekatte?q=${encodeURIComponent(q)}`);
  },

  async validateRegionCode(q) {
    return await apiRequest(
      `/validation/region-code?q=${encodeURIComponent(q)}`
    );
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

  async validateNuts(q) {
    return await apiRequest(`/validation/nuts?q=${encodeURIComponent(q)}`);
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

    return await apiRequest(`/region/excel-export?${params.toString()}`);
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

    return await apiRequest(`/region/csv-export?${params.toString()}`);
  },
};
