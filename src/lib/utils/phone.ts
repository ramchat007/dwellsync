/**
 * Phone Number Normalization & Validation Utility for Indian Telecom Standard
 */

export interface PhoneValidationResult {
  isValid: boolean;
  canonical?: string; // e.g. +919876543210
  display?: string;   // e.g. +91 98765 43210
  error?: string;
}

/**
 * Normalizes any Indian phone input into standard canonical E.164 (+91XXXXXXXXXX)
 * Accepts: "9876543210", "+91 98765 43210", "09876543210", "+91-98765-43210"
 */
export function normalizeIndianPhoneNumber(input: string): PhoneValidationResult {
  if (!input || typeof input !== "string") {
    return { isValid: false, error: "Mobile number is required." };
  }

  // Strip all whitespace, hyphens, parentheses, and dots
  let cleaned = input.replace(/[\s\-\(\)\.]/g, "");

  // Remove leading +91 or 91 or 0 prefix if present
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // Validate that remaining string is exactly 10 digits and starts with 6, 7, 8, or 9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(cleaned)) {
    return {
      isValid: false,
      error: "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
    };
  }

  const canonical = `+91${cleaned}`;
  const display = `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;

  return {
    isValid: true,
    canonical,
    display,
  };
}

export function isValidIndianMobile(input: string): boolean {
  return normalizeIndianPhoneNumber(input).isValid;
}

export function formatPhoneDisplay(phone: string): string {
  const result = normalizeIndianPhoneNumber(phone);
  return result.display || phone;
}

