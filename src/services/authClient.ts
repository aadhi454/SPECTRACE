export type UserRole = 'admin' | 'user';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  activeSessionCount?: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  emailAttempted: string;
  userId: string | null;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  details: string;
}

export interface SecuritySelfTestResultItem {
  id: number;
  scenario: string;
  expectedOutcome: string;
  actualStatus: number;
  actualDetail: string;
  passed: boolean;
}

// Held strictly in JavaScript closure memory (NEVER in localStorage or sessionStorage)
let inMemorySessionToken = '';
let inMemoryCsrfToken = '';

export function setInMemoryAuthTokens(
  sessionToken: string,
  csrfToken: string
): void {
  inMemorySessionToken = sessionToken;
  inMemoryCsrfToken = csrfToken;
}

export function clearInMemoryAuthTokens(): void {
  inMemorySessionToken = '';
  inMemoryCsrfToken = '';
}

export function getInMemoryCsrfToken(): string {
  return inMemoryCsrfToken;
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'SpecTrace-HttpClient');

  if (inMemorySessionToken) {
    headers.set('Authorization', `Bearer ${inMemorySessionToken}`);
  }
  if (inMemoryCsrfToken) {
    headers.set('X-CSRF-Token', inMemoryCsrfToken);
  }

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
}
