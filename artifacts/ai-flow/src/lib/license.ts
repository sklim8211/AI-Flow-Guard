import { ws } from "./workspace";

/** localStorage key that stores the Pro license key. */
export const LICENSE_STORAGE_KEY = "qq_license_key";

/** Free plan file ceiling. Pro removes this limit entirely. */
export const FREE_FILE_LIMIT = 50;

/** Lemon Squeezy checkout links. */
export const CHECKOUT_URLS = {
  monthly:
    "https://aisidecar.lemonsqueezy.com/checkout/buy/5e84f0f9-eef4-4e60-99b4-227da193caf0",
  annual:
    "https://aisidecar.lemonsqueezy.com/checkout/buy/e59e7eca-97bd-4358-b6fe-3357151ddaba",
} as const;

export function getLicenseKey(): string | null {
  try {
    return localStorage.getItem(LICENSE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function hasLicense(): boolean {
  const key = getLicenseKey();
  return !!key && key.trim().length > 0;
}

export function setLicenseKey(key: string) {
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, key.trim());
  } catch {
    // localStorage unavailable / quota-blocked — fail quietly.
  }
}

/** Total files across every project / folder in localStorage. */
export function countAllFiles(): number {
  return ws.getFiles().length;
}
