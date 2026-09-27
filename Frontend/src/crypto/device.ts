const DEVICE_ID_KEY = "zuno_device_id";

/**
 * Returns the stable, unique device identifier for this client instance.
 * Stored persistently in localStorage so that this physical device/browser instance
 * retains the same cryptographic device identity across page reloads and logins.
 */
export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      if (typeof window.crypto?.randomUUID === "function") {
        deviceId = window.crypto.randomUUID();
      } else {
        deviceId = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return "dev_fallback_" + Date.now();
  }
}
