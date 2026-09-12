/**
 * Sanitizer and security guards for spreadsheet imports & exports.
 * Provides CSV/XLSX Formula Injection (CWE-1236) defense and data normalization.
 */

// Formula prefixes that can trigger code or DDE execution in Excel/Calc/Sheets
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r", "|", "%"];

/**
 * Neutralizes any cell value that could be evaluated as a spreadsheet formula or macro.
 * If the value starts with dangerous characters, prefixes it with a single quote ('')
 * which forces Excel and spreadsheet software to treat it as plain text.
 */
export function escapeCsvFormula(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  const rawStr = String(value);
  if (!rawStr) return "";

  const trimmed = rawStr.trim();
  for (const prefix of FORMULA_PREFIXES) {
    if (rawStr.startsWith(prefix) || trimmed.startsWith(prefix)) {
      return `'${trimmed}`;
    }
  }

  return trimmed;
}

/**
 * Checks whether a raw string value is potentially a malicious formula.
 */
export function isFormulaInjection(value: any): boolean {
  if (typeof value !== "string") return false;
  if (!value) return false;
  const trimmed = value.trim();
  return FORMULA_PREFIXES.some(
    (prefix) => value.startsWith(prefix) || trimmed.startsWith(prefix)
  );
}

/**
 * Normalizes email address: trims whitespace and converts to lower case.
 */
export function normalizeEmail(email: any): string | null {
  if (!email || typeof email !== "string") return null;
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(clean) ? clean : null;
}

/**
 * Normalizes phone number: extracts numbers, handles +91 or leading 0.
 * Standardizes to 10 digits for Indian phone numbers if valid.
 */
export function normalizePhone(phone: any): string | null {
  if (!phone) return null;
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, "");

  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

/**
 * Normalizes text: trims excess spaces, replaces newlines/tabs with single space.
 */
export function normalizeText(text: any): string {
  if (text === null || text === undefined) return "";
  return String(text).trim().replace(/\s+/g, " ");
}

/**
 * Normalizes unit numbers (e.g., "  a-101 " -> "A-101").
 */
export function normalizeUnitNumber(unit: any): string {
  if (!unit) return "";
  return String(unit).trim().toUpperCase();
}

/**
 * Recursively sanitizes an entire record or array so that any string value
 * is protected against formula injection when exported or logged.
 */
export function sanitizeRecordForExport<T extends Record<string, any>>(record: T): T {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === "string") {
      result[key] = escapeCsvFormula(val);
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      result[key] = sanitizeRecordForExport(val);
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) =>
        typeof item === "string"
          ? escapeCsvFormula(item)
          : item && typeof item === "object"
          ? sanitizeRecordForExport(item)
          : item
      );
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

