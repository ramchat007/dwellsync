/**
 * Centralized URL and origin resolver for DwellSync authentication and OAuth.
 * Ensures consistent handling between local development and production environments,
 * prevents open redirect vulnerabilities, and eliminates trailing-slash inconsistencies.
 */

/**
 * Resolves the canonical application origin.
 * Priority:
 * 1. Incoming request headers (x-forwarded-proto + x-forwarded-host, or host)
 * 2. process.env.NEXT_PUBLIC_APP_URL
 * 3. process.env.NEXT_PUBLIC_SITE_URL
 * 4. process.env.SITE_URL
 * 5. Fallback: http://localhost:3000
 */
export function getAppOrigin(request?: Request): string {
  if (request) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const proto = forwardedProto || "https";
      return `${proto}://${forwardedHost}`.replace(/\/+$/, "");
    }

    const host = request.headers.get("host");
    if (host) {
      const proto = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/+$/, "");
    }

    try {
      const url = new URL(request.url);
      return url.origin.replace(/\/+$/, "");
    } catch {
      // Fall through to environment variables
    }
  }

  const envOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL;

  if (envOrigin) {
    return envOrigin.trim().replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

/**
 * Validates and sanitizes internal redirect target paths.
 * Prevents open-redirect attacks by strictly ensuring relative internal paths.
 *
 * Rules:
 * - Must start with a single "/"
 * - Must NOT start with "//" (protocol-relative external redirect)
 * - Must NOT start with "/\\" (Windows path trick)
 * - Must NOT contain protocol schemes ("http:", "https:", "javascript:", "data:")
 */
export function sanitizeRedirectPath(
  path: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!path) return fallback;

  const trimmed = path.trim();

  // Must start with '/' and not '//' or '/\'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject URL encodings of slashes or control characters
  if (/%2f|%5c/i.test(trimmed)) {
    return fallback;
  }

  // Reject scheme patterns
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
