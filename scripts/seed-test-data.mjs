#!/usr/bin/env node
/**
 * Seeds the API with test data for every page, through the same endpoints
 * the app uses.
 *
 *   node scripts/seed-test-data.mjs            create the test records
 *   node scripts/seed-test-data.mjs --dry-run  log in and count, write nothing
 *   node scripts/seed-test-data.mjs --cleanup  delete every tagged test record
 *
 * Every record is tagged so it can be found and removed again: names start
 * with "TEST", references with "TEST-", and remarks / additional info carry
 * "[TEST-SEED]". Nothing untagged is ever deleted.
 *
 * Settings come from the environment, or from scripts/seed.local.env
 * (KEY=VALUE lines; git-ignored):
 *   CFS_SEED_USERNAME, CFS_SEED_PASSWORD   a Master account
 *   CFS_API_BASE_URL                       optional; defaults to REACT_APP_API_BASE_URL in .env
 */
import { readFileSync, existsSync } from "node:fs";
import { randomBytes, randomInt } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TAG = "[TEST-SEED]";
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const CLEANUP = args.has("--cleanup");
const FORCE = args.has("--force");

/* ── Settings ─────────────────────────────────────────────────────────── */

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const local = readEnvFile(join(ROOT, "scripts", "seed.local.env"));
const appEnv = readEnvFile(join(ROOT, ".env"));
const setting = (key) => process.env[key] || local[key];

const BASE = (setting("CFS_API_BASE_URL") || appEnv.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const USERNAME = setting("CFS_SEED_USERNAME");
const PASSWORD = setting("CFS_SEED_PASSWORD");

if (!BASE) fail("No API base URL. Set CFS_API_BASE_URL or REACT_APP_API_BASE_URL in .env.");
if (!USERNAME || !PASSWORD) {
  fail("No credentials. Set CFS_SEED_USERNAME and CFS_SEED_PASSWORD (a Master account), " +
       "in the environment or in scripts/seed.local.env.");
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/* ── HTTP ─────────────────────────────────────────────────────────────── */

let token = null;

function describe(body) {
  if (body && typeof body === "object") {
    const msg = body.statusMessage || body.message || body.title || body.statusText;
    const errors = body.errors && typeof body.errors === "object"
      ? Object.entries(body.errors).map(([k, v]) => `${k}: ${[].concat(v).join(" ")}`).join("; ")
      : "";
    return [msg, errors].filter(Boolean).join(" — ") || JSON.stringify(body).slice(0, 300);
  }
  return String(body ?? "").slice(0, 300);
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status} ${describe(data)}`);
    err.status = res.status;
    throw err;
  }
  // The CRUD wrapper: { statusCode, statusMessage, resultObject }.
  if (data && typeof data === "object" && "resultObject" in data) {
    if (Number(data.statusCode) >= 400) {
      const err = new Error(`${method} ${path} → ${data.statusCode} ${describe(data)}`);
      err.status = Number(data.statusCode);
      throw err;
    }
    return data.resultObject;
  }
  return data;
}

async function login() {
  const data = await api("POST", "/Auth/login", { username: USERNAME, password: PASSWORD });
  const src = data?.resultObject || data?.data || data || {};
  token = src.accessToken || src.access_token || src.token || src.jwt || src.jwtToken ||
          data?.accessToken || data?.token || null;
  if (!token) fail("Login worked but no access token came back.");
}

/** Every row of a list endpoint, paged or not. */
async function listAll(path) {
  const size = 100;
  const rows = [];
  for (let page = 1; page < 500; page += 1) {
    const sep = path.includes("?") ? "&" : "?";
    const raw = await api("GET", `${path}${sep}PageNumber=${page}&PageSize=${size}&Skip=${(page - 1) * size}`);
    if (Array.isArray(raw)) return raw; // unpaged: already everything
    const items = raw?.items ?? raw?.data ?? raw?.results ?? raw?.records ?? [];
    rows.push(...items);
    const meta = raw?.pagination ?? {};
    const total = meta.totalCount ?? raw?.totalCount ?? raw?.total ?? raw?.count;
    const totalPages = meta.totalPages ?? (total != null ? Math.ceil(total / size) : null);
    if (!items.length || (totalPages != null ? page >= totalPages : items.length < size)) break;
  }
  return rows;
}

/* ── Sample values ────────────────────────────────────────────────────── */

const pick = (a) => a[randomInt(a.length)];
const between = (lo, hi, step = 100) => Math.round((lo + Math.random() * (hi - lo)) / step) * step;
const digits = (n) => Array.from({ length: n }, () => randomInt(10)).join("");
const pad = (n, w = 3) => String(n).padStart(w, "0");

/** Local wall-clock date `daysAgo` days back, as the app sends it. */
function dateAgo(daysAgo, hour = 10 + randomInt(8)) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hour)}:${p(randomInt(60))}:00`;
}

const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank",
  "Bank of Baroda", "Punjab National Bank", "Yes Bank", "IndusInd Bank", "IDFC First Bank"];
const ACCOUNT_USES = ["Current", "Savings", "Collections", "Operations", "Payroll"];
const PEOPLE = ["Aarav Shah", "Priya Patel", "Rohan Mehta", "Sneha Iyer", "Vikram Singh", "Ananya Rao",
  "Karan Desai", "Meera Nair", "Arjun Reddy", "Isha Gupta", "Rahul Verma", "Pooja Joshi",
  "Nikhil Kulkarni", "Divya Menon", "Sahil Khan", "Kavya Pillai", "Aditya Bose", "Riya Chawla",
  "Manish Jain", "Tanvi Shetty"];
const PARTIES = ["Shree Mobiles", "Patel Telecom", "Om Sai Traders", "City Phone Hub",
  "Krishna Electronics", "Royal Mobile Point", "Balaji Communication", "Galaxy Mobile Store"];
const MODELS = ["iPhone 15 128GB", "Galaxy S24 256GB", "Redmi Note 13 Pro", "OnePlus 12R", "Vivo V30",
  "Oppo Reno 11", "Pixel 8a", "Realme 12 Pro+", "Galaxy A55", "iPhone 13 128GB"];
const COLOURS = ["Black", "Blue", "Silver", "Green", "Titanium", "White", "Lavender"];
const POS = ["Pine Labs", "Paytm POS", "Razorpay POS", "Mswipe", "BharatPe"];
const STAFF = ["Ravi", "Amit", "Neha", "Kiran", "Suresh"];

/* ── Seeding ──────────────────────────────────────────────────────────── */

const results = {};
function tally(name, ok, error) {
  results[name] ??= { created: 0, failed: 0, errors: new Set() };
  if (ok) results[name].created += 1;
  else { results[name].failed += 1; results[name].errors.add(error.message); }
}
async function attempt(name, fn) {
  try { const r = await fn(); tally(name, true); return r; }
  catch (e) { tally(name, false, e); return null; }
}

async function seedBank() {
  // 20 accounts, 2 of them inactive, each with an opening balance.
  const accounts = [];
  for (let i = 1; i <= 20; i += 1) {
    const bank = BANKS[(i - 1) % BANKS.length];
    const payload = {
      bankName: bank,
      accountName: `TEST ${ACCOUNT_USES[(i - 1) % ACCOUNT_USES.length]} ${pad(i, 2)}`,
      accountNo: `9${digits(11)}`,
      isActive: i <= 18,
    };
    const created = await attempt("Bank accounts", () => api("POST", "/BankAccount", payload));
    if (created) accounts.push({ ...payload, id: created?.id ?? created?.accountId ?? null });
  }

  // Some create calls don't return the new id; find those by account number.
  if (accounts.some((a) => a.id == null)) {
    const all = await listAll("/BankAccount");
    for (const a of accounts) {
      if (a.id == null) a.id = all.find((x) => x.accountNo === a.accountNo)?.id ?? null;
    }
  }
  const usable = accounts.filter((a) => a.id != null);

  for (const a of usable) {
    await attempt("Bank transactions", () => api("POST", "/BankTransaction", {
      accountId: Number(a.id), relatedAccountId: null,
      transactionDate: dateAgo(60, 9), transactionType: "OPENING",
      amount: between(100000, 800000, 1000),
      referenceNo: `TEST-OPN-${pad(a.id, 4)}`, remarks: `${TAG} Opening balance`,
    }));
  }

  const active = usable.filter((a) => a.isActive);
  if (!active.length) return;
  const inNotes = ["NEFT from party", "Cash deposit", "UPI collection", "Card settlement", "RTGS receipt"];
  const outNotes = ["Supplier payment", "Shop rent", "Electricity bill", "Staff salary", "GST payment"];
  for (let i = 1; i <= 25; i += 1) {
    const isIn = i % 5 !== 0 && i % 3 !== 0;
    await attempt("Bank transactions", () => api("POST", "/BankTransaction", {
      accountId: Number(pick(active).id), relatedAccountId: null,
      transactionDate: dateAgo(randomInt(55)),
      transactionType: isIn ? "IN" : "OUT",
      amount: isIn ? between(5000, 150000) : between(2000, 60000),
      referenceNo: `TEST-BTX-${pad(i)}`,
      remarks: `${TAG} ${pick(isIn ? inNotes : outNotes)}`,
    }));
  }

  for (let i = 1; i <= 5 && active.length > 1; i += 1) {
    const from = pick(active);
    let to = pick(active);
    while (to.id === from.id) to = pick(active);
    await attempt("Bank transfers", () => api("POST", "/BankTransaction/transfer", {
      fromAccountId: Number(from.id), toAccountId: Number(to.id),
      transactionDate: dateAgo(randomInt(40)),
      amount: between(10000, 50000, 500),
      referenceNo: `TEST-TRF-${pad(i)}`, remarks: `${TAG} Fund transfer`,
    }));
  }
}

async function seedCardSwipes() {
  for (let i = 1; i <= 25; i += 1) {
    const deduction = between(10000, 200000, 500);
    await attempt("Card swipes", () => api("POST", "/CardInfo", {
      cardName: `TEST ${PEOPLE[(i - 1) % PEOPLE.length]}`,
      cardNumber: `4000${digits(12)}`,
      partyName: pick(PARTIES),
      deduction,
      date: dateAgo(randomInt(60)),
      pos: pick(POS),
      remarks: `${TAG} Sample swipe`,
      limitUsed: i % 3 === 0,
      additionalInfo: TAG,
      bankName: pick(BANKS),
      imei: `35${digits(13)}`,
      model: pick(MODELS),
      merchant: pick(PARTIES),
      swipePerson: pick(STAFF),
      profit: Math.round(deduction * (0.01 + Math.random() * 0.015)),
    }));
  }
}

async function seedStock() {
  // 15 bought in (2 later returned), 10 sold. The server creates the matching
  // stock payment for each: Payable for IN, Receivable for OUT.
  for (let i = 1; i <= 25; i += 1) {
    const out = i > 15;
    const inDays = 20 + randomInt(40);
    const amount = between(9000, 95000);
    await attempt("Stock items", () => api("POST", "/StockItem", {
      no: `TEST-STK-${pad(i)}`,
      inDate: dateAgo(inDays),
      outDate: out ? dateAgo(randomInt(inDays)) : null,
      imei: `35${digits(13)}`,
      colour: pick(COLOURS),
      model: pick(MODELS),
      gstMrp: Math.round(amount * 1.18),
      amount,
      partyName: pick(PARTIES),
      payment: pick(["Cash", "UPI", "Bank transfer", "Credit"]),
      inOut: out ? "OUT" : "IN",
      status: out ? "Sold" : i <= 2 ? "Returned" : "Available",
      soldTo: out ? `TEST ${pick(PEOPLE)}` : null,
      remarks: `${TAG} Sample stock`,
    }));
  }
}

async function seedCash() {
  const inNotes = ["Counter sale", "Customer payment", "Swipe cash-out", "Party settlement"];
  const outNotes = ["Tea and snacks", "Courier charges", "Staff advance", "Shop supplies", "Party payout"];
  for (let i = 1; i <= 25; i += 1) {
    const isIn = i % 5 !== 0 && i % 4 !== 0;
    await attempt("Cash ledger", () => api("POST", "/CashLedger", {
      transactionDate: dateAgo(randomInt(45)),
      transactionType: isIn ? "IN" : "OUT",
      name: `TEST ${pick(PEOPLE)}`,
      amount: isIn ? between(2000, 50000) : between(500, 20000),
      remarks: `${TAG} ${pick(isIn ? inNotes : outNotes)}`,
      createdBy: USERNAME,
    }));
  }
}

/* Accounts nobody can sign in to: each gets a long random password that is
   never printed or stored. */
const randomPassword = () => `Tt9!${randomBytes(18).toString("base64url")}`;

async function seedUsers() {
  for (let i = 1; i <= 20; i += 1) {
    const fullName = PEOPLE[i - 1];
    await attempt("Users", () => api("POST", "/Users", {
      username: `test.user${pad(i, 2)}`,
      password: randomPassword(),
      phoneNumber: `9${digits(9)}`,
      fullName: `TEST ${fullName}`,
      nickName: fullName.split(" ")[0],
      additionalInfo: TAG,
      role: i <= 5 ? "Admin" : "User",
    }));
  }
}

/* ── Clean-up: only tagged records ────────────────────────────────────── */

const tagged = (...values) => values.some((v) => typeof v === "string" && (v.includes(TAG) || v.startsWith("TEST")));

async function removeAll(name, rows, pathFor) {
  for (const row of rows) {
    try { await api("DELETE", pathFor(row)); tally(name, true); }
    catch (e) { if (e.status === 404) tally(name, true); else tally(name, false, e); }
  }
}

async function cleanup() {
  const tx = (await listAll("/BankTransaction")).filter((r) => tagged(r.referenceNo, r.remarks));
  await removeAll("Bank transactions", tx, (r) => `/BankTransaction/${r.id}`);

  const accounts = (await listAll("/BankAccount")).filter((r) => r.accountName?.startsWith("TEST "));
  await removeAll("Bank accounts", accounts, (r) => `/BankAccount/${r.id}`);

  const cards = (await listAll("/CardInfo")).filter((r) => r.additionalInfo === TAG && tagged(r.cardName));
  await removeAll("Card swipes", cards, (r) => `/CardInfo/${r.id}`);

  const stock = (await listAll("/StockItem")).filter((r) => r.no?.startsWith("TEST-STK-"));
  await removeAll("Stock items", stock, (r) => `/StockItem/${r.id}`);

  const cash = (await listAll("/CashLedger")).filter((r) => tagged(r.remarks) && r.name?.startsWith("TEST "));
  await removeAll("Cash ledger", cash, (r) => `/CashLedger/${r.id}`);

  const users = (await listAll("/Users")).filter((r) => /^test\.user\d+$/.test(r.username || "") && r.additionalInfo === TAG);
  await removeAll("Users", users, (r) => `/Users/${r.id ?? r.userId}`);
}

/* ── Run ──────────────────────────────────────────────────────────────── */

function report(verb) {
  console.log("");
  for (const [name, r] of Object.entries(results)) {
    console.log(`  ${name.padEnd(18)} ${String(r.created).padStart(3)} ${verb}${r.failed ? `, ${r.failed} failed` : ""}`);
    for (const msg of r.errors) console.log(`      ↳ ${msg}`);
  }
  console.log("");
}

(async () => {
  console.log(`API: ${BASE}`);
  await login();
  console.log("Signed in.");

  if (CLEANUP) {
    await cleanup();
    report("deleted");
    return;
  }

  // Refuse to seed twice unless asked: duplicates would double every figure.
  const existing = (await listAll("/BankAccount")).filter((a) => a.accountName?.startsWith("TEST "));
  if (existing.length && !FORCE) {
    fail(`${existing.length} TEST bank accounts already exist, so this data looks seeded already. ` +
         "Run with --cleanup first, or --force to add another batch.");
  }

  if (DRY_RUN) {
    console.log("Dry run: credentials work and nothing is seeded yet. Nothing was written.");
    return;
  }

  await seedBank();
  await seedCardSwipes();
  await seedStock();
  await seedCash();
  await seedUsers();
  report("created");
})().catch((e) => fail(e.message));
