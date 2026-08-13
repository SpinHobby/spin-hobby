const ADMIN_PASSWORD_STORAGE_KEY = "spinhobby_admin_password";

export function getStoredAdminPassword(): string | null {
  return localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
}

export function setStoredAdminPassword(password: string): void {
  localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, password);
}

export function clearStoredAdminPassword(): void {
  localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
}

// Attach to the `headers` field of an axios request config for any
// /homepage/admin/* or /ops/* call - the backend checks this against
// ADMIN_PASSWORD via requireAdminAuth.
export function adminAuthHeaders(): Record<string, string> {
  const password = getStoredAdminPassword();
  return password ? { "x-admin-password": password } : {};
}
