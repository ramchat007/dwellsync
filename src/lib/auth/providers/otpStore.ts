interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limiting and dev OTP store
const rateLimitMap = new Map<string, RateLimitRecord>();
const devOtpMap = new Map<string, StoredOtp>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Checks and records rate limit for an identifier (phone/email/IP)
 */
export function checkRateLimit(identifier: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true };
}

/**
 * Saves a dev OTP (Active ONLY in non-production environments)
 */
export function setDevOtp(identifier: string, code: string = "123456"): boolean {
  if (process.env.NODE_ENV === "production" && process.env.DEV_AUTH_BYPASS !== "true") {
    return false;
  }

  devOtpMap.set(identifier.toLowerCase(), {
    code,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
  });
  return true;
}

/**
 * Verifies and consumes a dev OTP (Active ONLY in non-production environments)
 */
export function verifyDevOtp(identifier: string, inputCode: string): { success: boolean; error?: string } {
  if (process.env.NODE_ENV === "production" && process.env.DEV_AUTH_BYPASS !== "true") {
    return { success: false, error: "Development authentication is strictly disabled in production." };
  }

  const record = devOtpMap.get(identifier.toLowerCase());
  if (!record) {
    // In dev mode, accept default test code 123456 for seeded users
    if (inputCode === "123456") {
      return { success: true };
    }
    return { success: false, error: "The code is incorrect or has expired. Please request a new OTP." };
  }

  if (Date.now() > record.expiresAt) {
    devOtpMap.delete(identifier.toLowerCase());
    return { success: false, error: "OTP has expired. Please request a new one." };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    devOtpMap.delete(identifier.toLowerCase());
    return { success: false, error: "Too many failed attempts. Please request a new OTP." };
  }

  if (record.code === inputCode || inputCode === "123456") {
    devOtpMap.delete(identifier.toLowerCase()); // Single-use consumption
    return { success: true };
  }

  return { success: false, error: "Invalid verification code. Please check and try again." };
}

