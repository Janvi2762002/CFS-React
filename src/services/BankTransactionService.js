import apiClient, { unwrap } from "./apiClient";
import { fetchAllPages } from "./paginate";
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

const DIRECTION = Object.fromEntries(TRANSACTION_TYPES.map((t) => [t.value, t.direction]));

export const isTransfer = (type) => type === "TRANSFER_IN" || type === "TRANSFER_OUT";

/** "credit", "debit", or null for a type the API does not define. */
export const directionOf = (row) =>
  DIRECTION[String(row?.transactionType || "").toUpperCase()] ?? null;

/**
 * Attach each row's running account balance as `balance`.
 */
export function withRunningBalance(rows) {
  const byAccount = new Map();
  rows.forEach((r) => {
    const list = byAccount.get(r.accountId) || [];
    list.push(r);
    byAccount.set(r.accountId, list);
  });

  const balanceById = new Map();
  byAccount.forEach((list) => {
    list.sort((a, b) =>
      (Date.parse(a.transactionDate) || 0) - (Date.parse(b.transactionDate) || 0) ||
      (Number(a.id) || 0) - (Number(b.id) || 0)
    );
    let running = 0;
    list.forEach((r) => {
      const amount = Number(r.amount) || 0;
      const dir = directionOf(r);
      if (dir === "credit") running += amount;
      if (dir === "debit") running -= amount;
      balanceById.set(r.id, running);
    });
  });

  return rows.map((r) => ({ ...r, balance: balanceById.get(r.id) ?? null }));
}

/**
 * Shape a transaction to the BankTransaction contract for single account movements.
 */
function toApiTransaction(t) {
  const type = String(t.transactionType || "").toUpperCase();
  return {
    ...(t.id != null ? { id: Number(t.id) } : {}),
    accountId: Number(t.accountId),
    relatedAccountId: isTransfer(type) && t.relatedAccountId !== "" && t.relatedAccountId != null
      ? Number(t.relatedAccountId)
      : null,
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
}

const bankTransactionService = new BankTransactionService();
export default bankTransactionService;
