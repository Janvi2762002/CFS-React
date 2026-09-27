import apiClient, { unwrap } from "./apiClient";

class CashLedgerService {
  async getEntries() {
    const response = await apiClient.get("/CashLedger");
    return unwrap(response);
  }

  async getEntry(id) {
    const response = await apiClient.get(`/CashLedger/${id}`);
    return unwrap(response);
  }

  async getByType(transactionType) {
    const response = await apiClient.get(`/CashLedger/type/${encodeURIComponent(transactionType)}`);
    return unwrap(response);
  }

  async getOpeningTotal() {
    const response = await apiClient.get("/CashLedger/summary/opening");
    return unwrap(response);
  }

  async getInTotal() {
    const response = await apiClient.get("/CashLedger/summary/in");
    return unwrap(response);
  }

  async getOutTotal() {
    const response = await apiClient.get("/CashLedger/summary/out");
    return unwrap(response);
  }

  async getCurrentBalance() {
    const response = await apiClient.get("/CashLedger/summary/current");
    return unwrap(response);
  }

  async saveEntry(data) {
    const response = await apiClient.post("/CashLedger", data);
    return unwrap(response);
  }

  async updateEntry(id, data) {
    const response = await apiClient.put(`/CashLedger/${id}`, data);
    return unwrap(response);
  }

  async deleteEntry(id) {
    const response = await apiClient.delete(`/CashLedger/${id}`);
    return unwrap(response);
  }
}

export default new CashLedgerService();
