import apiClient, { unwrap } from "./apiClient";
import { fetchAllPages, normaliseList, pageParams, toArray } from "./paginate";
import { toApiDate, toApiNumber, toApiText } from "./payload";

/** Shape a stock item to the documented StockItem contract. */
function toApiStockItem(item) {
  return {
    ...(item.id != null ? { id: Number(item.id) } : {}),
    no: item.no?.trim() ?? "",
    inDate: toApiDate(item.inDate),
    outDate: toApiDate(item.outDate),
    imei: toApiText(item.imei),
    colour: toApiText(item.colour),
    model: toApiText(item.model),
    gstMrp: toApiNumber(item.gstMrp),
    amount: toApiNumber(item.amount),
    partyName: toApiText(item.partyName),
    payment: toApiText(item.payment),
    inOut: toApiText(item.inOut),
    status: toApiText(item.status),
    soldTo: toApiText(item.soldTo),
    remarks: toApiText(item.remarks),
  };
}

class StockItemService {
  /** Fetch every stock item as a plain array, across all server pages. */
  async getItems() {
    return fetchAllPages(
      async (params) => unwrap(await apiClient.get("/StockItem", { params }))
    );
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
    const response = await apiClient.post("/StockItem", toApiStockItem(data));
    return unwrap(response);
  }

  async updateItem(id, data) {
    const payload = { ...toApiStockItem(data), id: Number(id) };
    const response = await apiClient.put(`/StockItem/${id}`, payload);
    return unwrap(response);
  }

  async deleteItem(id) {
    const response = await apiClient.delete(`/StockItem/${id}`);
    return unwrap(response);
  }
}

export default new StockItemService();
