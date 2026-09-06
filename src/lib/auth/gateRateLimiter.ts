interface GateRateLimitRecord {
  failures: number;
  lockoutUntil: number;
}

const gateAttemptMap = new Map<string, GateRateLimitRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes lockout

/**
 * Checks if the security checkpoint verification attempt is allowed.
 */
export function checkGatePassRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
  remainingAttempts: number;
} {
  const now = Date.now();
  const record = gateAttemptMap.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  if (record.lockoutUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds, remainingAttempts: 0 };
  }

  // Lockout expired, reset
  if (record.lockoutUntil > 0 && record.lockoutUntil <= now) {
    gateAttemptMap.delete(key);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - record.failures),
  };
}

/**
 * Records a failed passcode verification attempt. Locks out after MAX_FAILED_ATTEMPTS.
 */
export function recordGatePassFailure(key: string): {
  isLockedOut: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  let record = gateAttemptMap.get(key);

  if (!record) {
    record = { failures: 0, lockoutUntil: 0 };
    gateAttemptMap.set(key, record);
  }

  record.failures += 1;

  if (record.failures >= MAX_FAILED_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    const retryAfterSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return { isLockedOut: true, retryAfterSeconds };
  }

  return { isLockedOut: false };
}

/**
 * Resets failures upon a successful verification.
 */
export function resetGatePassAttempts(key: string): void {
  gateAttemptMap.delete(key);
}
