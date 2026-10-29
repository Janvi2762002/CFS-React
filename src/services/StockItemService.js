import apiClient, { unwrap } from "./apiClient";
import { fetchAllPages, listParams, normaliseList, toArray } from "./paginate";
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
  /** Every stock item matching the filters, across all server pages. */
  async getItems(filters = {}) {
    return fetchAllPages(async (params) =>
      unwrap(await apiClient.get("/StockItem", { params: { ...listParams(filters), ...params } }))
    );
  }

  /**
   * One page of stock items. Returns { data, total, ... }. Each item carries
   * `paymentStatus` ("Pending" | "Completed") from its stock payment.
   * `search` matches no., model, IMEI, party and sold-to.
   * @param {{ page?: number, pageSize?: number, search?: string, status?: string, inOut?: string, sortBy?: string, sortDir?: string }} params  — 1-indexed page
   */
  async getItemsPaginated(opts = {}) {
    const { page = 1, pageSize = 25 } = opts;
    const raw = unwrap(await apiClient.get("/StockItem", { params: listParams(opts) }));
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
