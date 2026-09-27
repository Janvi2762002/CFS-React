import apiClient, { unwrap } from "./apiClient";

class StockItemService {
  async getItems() {
    const response = await apiClient.get("/StockItem");
    return unwrap(response);
  }

  async getItem(id) {
    const response = await apiClient.get(`/StockItem/${id}`);
    return unwrap(response);
  }

  async getByParty(partyName) {
    const response = await apiClient.get(`/StockItem/by-party/${encodeURIComponent(partyName)}`);
    return unwrap(response);
  }

  async getByStatus(status) {
    const response = await apiClient.get(`/StockItem/by-status/${encodeURIComponent(status)}`);
    return unwrap(response);
  }

  async getByInOut(inOut) {
    const response = await apiClient.get(`/StockItem/by-inout/${encodeURIComponent(inOut)}`);
    return unwrap(response);
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
