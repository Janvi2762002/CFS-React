import apiClient, { unwrap } from "./apiClient";
import { fetchAllPages, normaliseList, pageParams } from "./paginate";
import { toApiDate, toApiNumber, toApiText } from "./payload";

/** Shape a payment to the StockPaymentInfo contract (`inOut` is IN or OUT). */
function toApiStockPayment(payment) {
  return {
    ...(payment.id != null ? { id: Number(payment.id) } : {}),
    no: payment.no?.trim() ?? "",
    accountName: toApiText(payment.accountName),
    accountNo: toApiText(payment.accountNo),
    ifsc: toApiText(payment.ifsc)?.toUpperCase() ?? null,
    amount: toApiNumber(payment.amount),
    date: toApiDate(payment.date),
    partyName: toApiText(payment.partyName),
    bank: toApiText(payment.bank),
    inOut: toApiText(payment.inOut),
    remarks: toApiText(payment.remarks),
    stockItemId: Number(payment.stockItemId),
  };
}

/** Optional list filters the endpoint accepts alongside paging. */
function filterParams({ partyName, inOut } = {}) {
  const params = {};
  if (partyName?.trim()) params.partyName = partyName.trim();
  if (inOut && inOut !== "all") params.inOut = inOut;
  return params;
}

class StockPaymentInfoService {
  /** Fetch every stock payment as a plain array, across all server pages. */
  async getPayments(filters) {
    return fetchAllPages(async (params) =>
      unwrap(await apiClient.get("/StockPaymentInfo", { params: { ...params, ...filterParams(filters) } }))
    );
  }

  /**
   * Fetch stock payments with server-side pagination.
   * Returns { data: [], total: number, next, previous }.
   * @param {{ page?: number, pageSize?: number, partyName?: string, inOut?: string }} params  — 1-indexed page
   */
  async getPaymentsPaginated({ page = 1, pageSize = 25, ...filters } = {}) {
    const params = { ...pageParams({ page, pageSize }), ...filterParams(filters) };
    const raw = unwrap(await apiClient.get("/StockPaymentInfo", { params }));
    return normaliseList(raw, page, pageSize);
  }

  async getPayment(id) {
    const response = await apiClient.get(`/StockPaymentInfo/${id}`);
    return unwrap(response);
  }

  /** All payments recorded against one stock item. */
  async getByStockItem(stockItemId) {
    return fetchAllPages(async (params) =>
      unwrap(await apiClient.get(`/StockPaymentInfo/stock/${stockItemId}`, { params }))
    );
  }

  async savePayment(data) {
    const response = await apiClient.post("/StockPaymentInfo", toApiStockPayment(data));
    return unwrap(response);
  }

  async updatePayment(id, data) {
    const payload = { ...toApiStockPayment(data), id: Number(id) };
    const response = await apiClient.put(`/StockPaymentInfo/${id}`, payload);
    return unwrap(response);
  }

  async deletePayment(id) {
    const response = await apiClient.delete(`/StockPaymentInfo/${id}`);
    return unwrap(response);
  }
}

export default new StockPaymentInfoService();
