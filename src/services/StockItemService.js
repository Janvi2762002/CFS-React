import apiClient, { unwrap } from "./apiClient";
import { normaliseList, pageParams, toArray } from "./paginate";

class StockItemService {
  /** Fetch all stock items as a plain array (backward-compatible). Guaranteed to return an array. */
  async getItems() {
    const response = await apiClient.get("/StockItem");
    return toArray(unwrap(response));
  }

  /**
   * Fetch stock items with server-side pagination.
   * Returns { data: [], total: number, next, previous }.
   * @param {{ page?: number, pageSize?: number }} params  — 1-indexed page
   */
  async getItemsPaginated({ page = 1, pageSize = 25 } = {}) {
    const raw = unwrap(
      await apiClient.get("/StockItem", { params: pageParams({ page, pageSize }) })
    );
    return normaliseList(raw, page, pageSize);
  }

  async getItem(id) {
    const response = await apiClient.get(`/StockItem/${id}`);
    return unwrap(response);
  }

  async getByParty(partyName) {
    const response = await apiClient.get(`/StockItem/by-party/${encodeURIComponent(partyName)}`);
    return toArray(unwrap(response));
  }

  async getByStatus(status) {
    const response = await apiClient.get(`/StockItem/by-status/${encodeURIComponent(status)}`);
    return toArray(unwrap(response));
  }

  async getByInOut(inOut) {
    const response = await apiClient.get(`/StockItem/by-inout/${encodeURIComponent(inOut)}`);
    return toArray(unwrap(response));
  }

  async saveItem(data) {
    const response = await apiClient.post("/StockItem", data);
    return unwrap(response);
  }

  async updateItem(id, data) {
    const response = await apiClient.put(`/StockItem/${id}`, data);
    return unwrap(response);
  }

  async deleteItem(id) {
    const response = await apiClient.delete(`/StockItem/${id}`);
    return unwrap(response);
  }
}

export default new StockItemService();
