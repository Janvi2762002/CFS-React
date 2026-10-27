import apiClient, { unwrap } from "./apiClient";
import { fetchAllPages, normaliseList, pageParams } from "./paginate";
import { toApiDate, toApiNumber, toApiText } from "./payload";

/**
 * Stock payments.
 *
 * The server creates one automatically for every stock item: an IN item
 * becomes a Payable to its supplier (partyName), an OUT item a Receivable
 * from its buyer (soldTo). Payments are never created, edited or deleted
 * here; they are only settled in full, reset by an admin, and audited.
 *
 * A payment's `paymentStatus` is "Pending" or "Completed"; `paymentType` is
 * "Payable" or "Receivable".
 */
export const PAYMENT_STATUSES = ["Pending", "Completed"];
export const PAYMENT_TYPES = ["Payable", "Receivable"];

/** Optional list filters the endpoints accept alongside paging. */
function filterParams({ partyName, inOut, paymentType, status } = {}) {
  const params = {};
  if (partyName?.trim()) params.partyName = partyName.trim();
  if (inOut && inOut !== "all") params.inOut = inOut;
  if (paymentType && paymentType !== "all") params.paymentType = paymentType;
  if (status && status !== "all") params.status = status;
  return params;
}

/** Shape a settlement to StockPaymentSettlementRequest. */
function toApiSettlement(s) {
  return {
    amount: toApiNumber(s.amount),
    transactionDate: toApiDate(s.transactionDate),
    paymentMethod: s.paymentMethod?.trim() ?? "",
    referenceNo: toApiText(s.referenceNo),
    remarks: toApiText(s.remarks),
  };
}

class StockPaymentInfoService {
  /**
   * One page of stock payments. Returns { data, total, ... }.
   * @param {{ page?: number, pageSize?: number, partyName?: string, inOut?: string, paymentType?: string, status?: string }} params  — 1-indexed page
   */
  async getPaymentsPaginated({ page = 1, pageSize = 25, ...filters } = {}) {
    const params = { ...pageParams({ page, pageSize }), ...filterParams(filters) };
    const raw = unwrap(await apiClient.get("/StockPaymentInfo", { params }));
    return normaliseList(raw, page, pageSize);
  }

  async getPayment(id) {
    return unwrap(await apiClient.get(`/StockPaymentInfo/${id}`));
  }

  /** The payment(s) the server created for one stock item. */
  async getByStockItem(stockItemId) {
    return fetchAllPages(async (params) =>
      unwrap(await apiClient.get(`/StockPaymentInfo/stock/${stockItemId}`, { params }))
    );
  }

  /** Outstanding totals: { pendingPayable, pendingReceivable }. */
  async getTotals() {
    return unwrap(await apiClient.get("/StockPaymentInfo/summary/totals"));
  }

  /**
   * One page of party-wise totals: { partyName, paymentType, itemCount,
   * totalAmount, completedAmount, outstandingAmount }.
   */
  async getPartySummariesPaginated({ page = 1, pageSize = 25, ...filters } = {}) {
    const params = { ...pageParams({ page, pageSize }), ...filterParams(filters) };
    const raw = unwrap(await apiClient.get("/StockPaymentInfo/summary/parties", { params }));
    return normaliseList(raw, page, pageSize);
  }

  /** Every Settlement / Reset event of one payment, as recorded by the server. */
  async getHistory(id) {
    return fetchAllPages(async (params) =>
      unwrap(await apiClient.get(`/StockPaymentInfo/${id}/history`, { params }))
    );
  }

  /**
   * Settle a pending payment in full. `amount` must equal the outstanding
   * amount exactly (400 otherwise); settling twice is a 409.
   */
  async settle(id, settlement) {
    return unwrap(await apiClient.patch(`/StockPaymentInfo/${id}/settle`, toApiSettlement(settlement)));
  }

  /** Reopen a completed payment. The reason is kept in its history. */
  async reset(id, reason) {
    return unwrap(await apiClient.patch(`/StockPaymentInfo/${id}/reset`, { reason: reason.trim() }));
  }
}

const stockPaymentInfoService = new StockPaymentInfoService();
export default stockPaymentInfoService;
