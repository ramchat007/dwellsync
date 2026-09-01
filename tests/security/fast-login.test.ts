import { describe, it, expect } from "vitest";
import { normalizeIndianPhoneNumber, formatPhoneDisplay, isValidIndianMobile } from "@/lib/utils/phone";
import { checkRateLimit, setDevOtp, verifyDevOtp } from "@/lib/auth/providers/otpStore";

describe("Phase 4: Indian Mobile Number Normalization & Validation", () => {
  it("normalizes clean 10-digit mobile numbers starting with 6, 7, 8, 9", () => {
    const res = normalizeIndianPhoneNumber("9876543210");
    expect(res.isValid).toBe(true);
    expect(res.canonical).toBe("+919876543210");
    expect(res.display).toBe("+91 98765 43210");
  });

  it("normalizes numbers with +91 prefix and formatting characters", () => {
    const res1 = normalizeIndianPhoneNumber("+91 98765 43210");
    expect(res1.isValid).toBe(true);
    expect(res1.canonical).toBe("+919876543210");

    const res2 = normalizeIndianPhoneNumber("+91-98765-43210");
    expect(res2.isValid).toBe(true);
    expect(res2.canonical).toBe("+919876543210");

    const res3 = normalizeIndianPhoneNumber("09876543210");
    expect(res3.isValid).toBe(true);
    expect(res3.canonical).toBe("+919876543210");
  });

  it("rejects invalid phone numbers", () => {
    expect(isValidIndianMobile("1234567890")).toBe(false); // Does not start with 6-9
    expect(isValidIndianMobile("98765")).toBe(false); // Too short
    expect(isValidIndianMobile("9876543210123")).toBe(false); // Too long
    expect(isValidIndianMobile("abcdefghij")).toBe(false); // Non-numeric
    expect(isValidIndianMobile("")).toBe(false); // Empty
  });

  it("formats canonical phone numbers for display", () => {
    expect(formatPhoneDisplay("+919876543210")).toBe("+91 98765 43210");
  });
});

describe("Phase 4: Rate Limiting & Dev OTP Verification", () => {
  it("enforces rate limiting after 5 attempts per window", () => {
    const testId = `test-limit-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const check = checkRateLimit(testId);
      expect(check.allowed).toBe(true);
    }
    const sixthCheck = checkRateLimit(testId);
    expect(sixthCheck.allowed).toBe(false);
    expect(sixthCheck.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("accepts valid dev OTP and consumes single-use token", () => {
    const testPhone = "+919999988888";
    setDevOtp(testPhone, "654321");

    // Invalid code fails
    const badVerify = verifyDevOtp(testPhone, "000000");
    expect(badVerify.success).toBe(false);

    // Correct code succeeds
    const goodVerify = verifyDevOtp(testPhone, "654321");
    expect(goodVerify.success).toBe(true);

    // Re-using consumed code fails (single-use)
    const reuseVerify = verifyDevOtp(testPhone, "654321");
    expect(reuseVerify.success).toBe(false);
  });
});

