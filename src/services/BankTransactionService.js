import apiClient, { unwrap } from "./apiClient";
import { fetchAllPages, normaliseList, pageParams } from "./paginate";
import { toApiDate, toApiNumber, toApiText } from "./payload";

/**
 * Bank account transactions.
 *
 * Supports single-account movements (OPENING, IN, OUT) via POST /api/BankTransaction
 * and account-to-account transfers via POST /api/BankTransaction/transfer.
 */
export const TRANSACTION_TYPES = [
  { value: "OPENING",      label: "Opening",      direction: "credit" },
  { value: "IN",           label: "Money in",     direction: "credit" },
  { value: "OUT",          label: "Money out",    direction: "debit"  },
  { value: "TRANSFER_IN",  label: "Transfer in",  direction: "credit" },
  { value: "TRANSFER_OUT", label: "Transfer out", direction: "debit"  },
];

/**
 * The only choices offered when adding an entry. A transfer is one entry
 * here and the server books it as a TRANSFER_OUT / TRANSFER_IN pair;
 * OPENING rows come only from creating an account.
 */
export const ENTRY_TYPES = [
  { value: "IN",       label: "Money in" },
  { value: "OUT",      label: "Money out" },
  { value: "TRANSFER", label: "Transfer" },
];

const DIRECTION = Object.fromEntries(TRANSACTION_TYPES.map((t) => [t.value, t.direction]));

export const isTransfer = (type) =>
  type === "TRANSFER" || type === "TRANSFER_IN" || type === "TRANSFER_OUT";

/** "credit", "debit", or null for a type the API does not define. */
export const directionOf = (row) =>
  DIRECTION[String(row?.transactionType || "").toUpperCase()] ?? null;

/**
 * Shape a transaction to the BankTransaction contract for single account movements.
 */
function toApiTransaction(t) {
  const type = String(t.transactionType || "").toUpperCase();
  // A transfer is two rows the server books together; saving one side alone
  // would leave the other account's balance wrong.
  if (isTransfer(type)) {
    throw new Error("Transfers between accounts must be saved with createTransfer.");
  }
  return {
    ...(t.id != null ? { id: Number(t.id) } : {}),
    accountId: Number(t.accountId),
    relatedAccountId: null,
    transactionDate: toApiDate(t.transactionDate),
    transactionType: type,
    amount: toApiNumber(t.amount),
    referenceNo: toApiText(t.referenceNo),
    remarks: toApiText(t.remarks),
  };
}

/**
 * Shape a transfer payload for POST /api/BankTransaction/transfer.
 */
function toApiTransfer(t) {
  return {
    fromAccountId: Number(t.fromAccountId || t.accountId),
    toAccountId: Number(t.toAccountId || t.relatedAccountId),
    transactionDate: toApiDate(t.transactionDate),
    amount: toApiNumber(t.amount),
    referenceNo: toApiText(t.referenceNo),
    remarks: toApiText(t.remarks),
  };
}

const OPPOSITE = { TRANSFER_OUT: "TRANSFER_IN", TRANSFER_IN: "TRANSFER_OUT" };

/**
 * The other side of a transfer row, from `candidates` (the related account's
 * transactions): the row that points back at this account with the opposite
 * type, same amount, date and reference. Identical twins are interchangeable
 * for balances; the closest id wins, since both sides are created together.
 */
export function findTransferPair(row, candidates) {
  const type = String(row?.transactionType || "").toUpperCase();
  const want = OPPOSITE[type];
  if (!want) return null;
  const sameDay = (a, b) => Date.parse(a) === Date.parse(b);
  const matches = candidates.filter((c) =>
    c.id !== row.id &&
    c.accountId === row.relatedAccountId &&
    c.relatedAccountId === row.accountId &&
    String(c.transactionType || "").toUpperCase() === want &&
    Math.abs((Number(c.amount) || 0) - (Number(row.amount) || 0)) < 0.005 &&
    sameDay(c.transactionDate, row.transactionDate) &&
    (c.referenceNo || "") === (row.referenceNo || "")
  );
  matches.sort((a, b) => Math.abs(a.id - row.id) - Math.abs(b.id - row.id));
  return matches[0] || null;
}

class BankTransactionService {
  /** Every transaction across all accounts. */
  async getTransactions(params) {
    return fetchAllPages(
      async (p) => unwrap(await apiClient.get("/BankTransaction", { params: { ...p, ...params } }))
    );
  }

  /** Every transaction of one account. */
  async getByAccount(accountId, params) {
    return fetchAllPages(
      async (p) => unwrap(await apiClient.get(`/BankTransaction/account/${accountId}`, { params: { ...p, ...params } }))
    );
  }

  /**
   * One page of transactions, across all accounts or for one account.
   * Returns { data, total, ... }.
   * @param {{ page?: number, pageSize?: number, accountId?: number }} params  — 1-indexed page
   */
  async getTransactionsPaginated({ page = 1, pageSize = 25, accountId } = {}) {
    const url = accountId == null ? "/BankTransaction" : `/BankTransaction/account/${accountId}`;
    const raw = unwrap(await apiClient.get(url, { params: pageParams({ page, pageSize }) }));
    return normaliseList(raw, page, pageSize);
  }

  async getTransaction(id) {
    return unwrap(await apiClient.get(`/BankTransaction/${id}`));
  }

  /** Create a single account movement (OPENING, IN, OUT). */
  async createTransaction(data) {
    return unwrap(await apiClient.post("/BankTransaction", toApiTransaction(data)));
  }

  /** Transfer funds between two managed accounts via POST /api/BankTransaction/transfer. */
  async createTransfer(data) {
    return unwrap(await apiClient.post("/BankTransaction/transfer", toApiTransfer(data)));
  }

  /** Alias for createTransfer. */
  async transfer(data) {
    return this.createTransfer(data);
  }

  async updateTransaction(id, data) {
    const payload = { ...toApiTransaction(data), id: Number(id) };
    return unwrap(await apiClient.put(`/BankTransaction/${id}`, payload));
  }

  async deleteTransaction(id) {
    return unwrap(await apiClient.delete(`/BankTransaction/${id}`));
  }

  /**
   * Delete a whole transfer. The API has no transfer delete endpoint, so the
   * other side is located and deleted by id as well.
   *
   * The pair is found before anything is deleted: looking afterwards could
   * match a different, identical transfer if the server had already removed
   * the real one. A 404 on the second delete means it did exactly that.
   *
   * @returns {{ pair: object|null }} the other side that was removed, or null if none was found
   */
  async deleteTransfer(row) {
    const candidates = row.relatedAccountId == null ? [] : await this.getByAccount(row.relatedAccountId);
    const pair = findTransferPair(row, candidates);

    await this.deleteTransaction(row.id);
    if (!pair) return { pair: null };

    try {
      await this.deleteTransaction(pair.id);
    } catch (e) {
      if (e?.status !== 404) {
        e.partial = true; // this side is gone; the other is still there
        throw e;
      }
    }
    return { pair };
  }
}

const bankTransactionService = new BankTransactionService();
export default bankTransactionService;
