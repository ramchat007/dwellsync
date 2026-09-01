import { cookies } from "next/headers";
import crypto from "crypto";

export const AUTH_SESSION_COOKIE_NAME = "dwellsync_auth_session";

export interface SessionPayload {
  userId: string;
  email?: string;
  phone?: string;
  isSuperAdmin: boolean;
  issuedAt: number;
  expiresAt: number;
}

const SESSION_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dwellsync-secure-session-secret-key-2026";

/**
 * Creates a cryptographically HMAC-signed session token
 */
export function signSessionToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verifies and decodes the session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!token || !token.includes(".")) return null;
    const [data, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(data)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    );

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Sets the secure HttpOnly session cookie
 */
export async function setAuthSessionCookie(data: {
  userId: string;
  email?: string;
  phone?: string;
  isSuperAdmin: boolean;
}): Promise<void> {
  const cookieStore = await cookies();
  const now = Date.now();
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

  const payload: SessionPayload = {
    userId: data.userId,
    email: data.email,
    phone: data.phone,
    isSuperAdmin: data.isSuperAdmin,
    issuedAt: now,
    expiresAt,
  };

  const token = signSessionToken(payload);

  cookieStore.set(AUTH_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

/**
 * Reads and verifies the current session cookie
 */
export async function getAuthSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Clears the session cookie
 */
export async function clearAuthSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE_NAME);
}

