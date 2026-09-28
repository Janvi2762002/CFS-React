import apiClient, { unwrap } from "./apiClient";
import { normaliseList } from "./paginate";

class CashLedgerService {
  /** Fetch all entries as a plain array (backward-compatible). */
  async getEntries() {
    const response = await apiClient.get("/CashLedger");
    return unwrap(response) || [];
  }

  /**
   * Fetch a page of cash ledger entries.
   *
   * Unlike the other list endpoints, /CashLedger accepts no paging
   * parameters and returns the full collection, so the window is applied
   * client-side. `total` is therefore the true total either way.
   *
   * @param {{ page?: number, pageSize?: number }} params  — 1-indexed page
   * @returns {{ data: [], total: number, page, totalPages, next, previous }}
   */
  async getEntriesPaginated({ page = 1, pageSize = 25 } = {}) {
    const raw = unwrap(await apiClient.get("/CashLedger"));
    return normaliseList(raw, page, pageSize);
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
