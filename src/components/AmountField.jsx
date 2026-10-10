import React, { useLayoutEffect, useRef } from "react";
import { TextField, InputAdornment } from "@mui/material";

/**
 * Rupee amount input that groups digits the Indian way while typing
 * (12,50,000.50) and spells the amount out underneath ("Twelve lakh fifty
 * thousand rupees and fifty paise"), so a missing or extra zero is obvious.
 *
 * The form keeps the plain value ("1250000.5"): `onChange` reports it under
 * `name` like any input, so commas never reach the API.
 */

const MAX_INT_DIGITS = 13; // ₹99,99,99,99,99,999 — far past any real entry

/** Keep digits and the first dot, at most two decimals, no leading zeros. */
export function toPlainAmount(input) {
  const s = String(input ?? "").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  let int = dot === -1 ? s : s.slice(0, dot);
  const dec = dot === -1 ? null : s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  int = int.replace(/^0+(?=\d)/, "").slice(0, MAX_INT_DIGITS);
  if (dec === null) return int;
  return `${int || "0"}.${dec}`;
}

/** "1250000.5" → "12,50,000.5" (last three digits, then pairs). */
export function groupAmount(plain) {
  if (!plain) return "";
  const [int, dec] = plain.split(".");
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return dec === undefined ? grouped : `${grouped}.${dec}`;
}

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

const belowHundred = (n) => (n < 20 ? ONES[n] : [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(" "));
const belowThousand = (n) =>
  [n >= 100 ? `${ONES[Math.floor(n / 100)]} hundred` : "", belowHundred(n % 100)].filter(Boolean).join(" ");

/** Whole number in the Indian system: crore, lakh, thousand. */
function inWords(n) {
  if (n === 0) return "zero";
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  return [
    crore ? `${inWords(crore)} crore` : "",
    lakh ? `${belowHundred(lakh)} lakh` : "",
    thousand ? `${belowHundred(thousand)} thousand` : "",
    belowThousand(n % 1e3),
  ].filter(Boolean).join(" ");
}

/** "1250000.5" → "Twelve lakh fifty thousand rupees and fifty paise". */
export function amountInWords(plain) {
  const n = Number(plain);
  if (!plain || !Number.isFinite(n) || n <= 0) return "";
  const [int, dec = ""] = plain.split(".");
  const rupees = Number(int) || 0;
  const paise = Number(dec.padEnd(2, "0")) || 0;
  const text = [
    rupees ? `${inWords(rupees)} ${rupees === 1 ? "rupee" : "rupees"}` : "",
    paise ? `${belowHundred(paise)} ${paise === 1 ? "paisa" : "paise"}` : "",
  ].filter(Boolean).join(" and ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Characters that carry the value; commas are decoration. */
const significantBefore = (s, pos) => s.slice(0, pos).replace(/[^\d.]/g, "").length;

export default function AmountField({ name, value, onChange, helperText, error, InputProps, ...rest }) {
  const inputRef = useRef(null);
  const caret = useRef(null);
  const plain = toPlainAmount(value);
  const display = groupAmount(plain);

  /* Re-grouping rewrites the text, which would throw the caret to the end;
     put it back after the same number of digits it followed before. */
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (caret.current == null || !el || document.activeElement !== el) return;
    let seen = 0;
    let pos = 0;
    while (pos < display.length && seen < caret.current) {
      if (/[\d.]/.test(display[pos])) seen += 1;
      pos += 1;
    }
    el.setSelectionRange(pos, pos);
    caret.current = null;
  }, [display]);

  const handleChange = (e) => {
    const typed = e.target.value;
    const next = toPlainAmount(typed);
    const sig = typed.replace(/[^\d.]/g, "");
    let at = significantBefore(typed, e.target.selectionStart ?? typed.length);
    // toPlainAmount edits the front: "." gains a "0", "007" loses its zeros.
    if (sig.startsWith(".")) at += 1;
    else at -= Math.min(at, (sig.match(/^0+(?=\d)/) || [""])[0].length);
    caret.current = Math.min(at, next.length);
    onChange?.({ target: { name, value: next } });
  };

  const words = amountInWords(plain);

  return (
    <TextField
      {...rest}
      name={name}
      value={display}
      onChange={handleChange}
      error={error}
      // A caller's message (usually a validation error) wins over the words.
      helperText={helperText || words || " "}
      inputRef={inputRef}
      inputProps={{ inputMode: "decimal", autoComplete: "off", ...rest.inputProps }}
      InputProps={{
        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        ...InputProps,
      }}
      FormHelperTextProps={{ sx: { minHeight: "1.25em" } }}
    />
  );
}
