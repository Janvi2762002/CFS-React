import apiClient, { unwrap } from "./apiClient";
import { normaliseList } from "./paginate";
import { toApiDate, toApiNumber, toApiText } from "./payload";

/* Newest first; entries on the same day fall back to the later id first. */
const byNewest = (a, b) =>
  (Date.parse(b.transactionDate) || 0) - (Date.parse(a.transactionDate) || 0) ||
  (Number(b.id) || 0) - (Number(a.id) || 0);

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
    // The window is cut locally, so order the full list before slicing it.
    const ordered = Array.isArray(raw) ? [...raw].sort(byNewest) : raw;
    return normaliseList(ordered, page, pageSize);
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
