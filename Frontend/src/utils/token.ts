/**
 * JWT and LocalStorage Token Utilities for Authentication & Route Protection.
 */

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken") || localStorage.getItem("token");
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", token);
  localStorage.setItem("token", token);
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
}

/**
 * Checks if a JWT token is expired, missing, or malformed.
 * Incorporates a 5-second clock skew buffer.
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp <= currentTime + 5;
  } catch {
    return true;
  }
}

/**
 * Returns the milliseconds remaining until token expiry, or 0 if expired/invalid.
 */
export function getTokenTimeRemainingMs(token: string | null): number {
  if (!token) return 0;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return 0;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return Infinity;

    const remainingMs = payload.exp * 1000 - Date.now();
    return Math.max(0, remainingMs);
  } catch {
    return 0;
  }
}
