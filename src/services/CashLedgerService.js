import apiClient, { unwrap } from "./apiClient";
import { listParams, normaliseList } from "./paginate";
import { toApiDate, toApiNumber, toApiText } from "./payload";

/** Shape an entry to the CashLedger contract (type is OPENING, IN or OUT). */
function toApiEntry(entry) {
  return {
    ...(entry.id != null ? { id: Number(entry.id) } : {}),
    transactionDate: toApiDate(entry.transactionDate),
    transactionType: entry.transactionType,
    name: toApiText(entry.name),
    amount: toApiNumber(entry.amount) ?? 0,
    remarks: toApiText(entry.remarks),
    createdBy: toApiText(entry.createdBy),
  };
}

class CashLedgerService {
  /**
   * One page of entries, newest first unless sorted otherwise.
   * Returns { data, total, ... }. `search` matches name and remarks.
   * @param {{ page?: number, pageSize?: number, search?: string, transactionType?: string, sortBy?: string, sortDir?: string }} params  — 1-indexed page
   */
  async getEntriesPaginated(opts = {}) {
    const { page = 1, pageSize = 25 } = opts;
    const raw = unwrap(await apiClient.get("/CashLedger", { params: listParams(opts) }));
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
    const response = await apiClient.post("/CashLedger", toApiEntry(data));
    return unwrap(response);
  }

  async updateEntry(id, data) {
    const payload = { ...toApiEntry(data), id: Number(id) };
    const response = await apiClient.put(`/CashLedger/${id}`, payload);
    return unwrap(response);
  }

  async deleteEntry(id) {
    const response = await apiClient.delete(`/CashLedger/${id}`);
    return unwrap(response);
  }
}

export default new CashLedgerService();
