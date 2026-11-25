import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { SEED_AUDIT_RECORDS, SEED_DATASHEETS } from '../data/seedDatasheets';
import { ProductRevision, SignOffAuditRecord } from '../types/spec';

export type UserRole = 'admin' | 'user';

export interface DbUserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: number;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface SafeUserDTO {
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

export interface DbSessionRow {
  id: string;
  session_token_hash: string;
  csrf_token: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
  is_revoked: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  emailAttempted: string;
  userId: string | null;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  details: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'spectrace_security.sqlite');
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign key constraints
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Create relational tables with strict constraints
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (email);

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    session_token_hash TEXT UNIQUE NOT NULL,
    csrf_token TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_activity_at TEXT NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0 CHECK (is_revoked IN (0, 1)),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (session_token_hash);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS login_audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    email_attempted TEXT NOT NULL,
    user_id TEXT,
    event_type TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    details TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS corpus_revisions (
    id TEXT PRIMARY KEY,
    model_code TEXT NOT NULL,
    revision TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('APPROVED', 'DRAFT', 'SUPERSEDED')),
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS signoff_audits (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    model_code TEXT NOT NULL,
    revision TEXT NOT NULL,
    project_reference TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Cryptographic password hashing via scrypt (memory-hard, resistant to GPU brute-force)
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
const KEY_LEN = 64;

export function hashPassword(plaintext: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto
    .scryptSync(plaintext, salt, KEY_LEN, SCRYPT_PARAMS)
    .toString('hex');
  return `scrypt$16384$8$1$${salt}$${derived}`;
}

// Precomputed dummy hash for constant-time verification when an email is not in the allowlist
const DUMMY_PASSWORD_HASH = hashPassword('dummy-constant-time-mitigation-secret');

export function verifyPasswordHash(
  plaintext: string,
  storedHash: string | null | undefined
): boolean {
  const target = storedHash || DUMMY_PASSWORD_HASH;
  const parts = target.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }
  const salt = parts[4];
  const expectedHex = parts[5];
  const derivedBuffer = crypto.scryptSync(
    plaintext,
    salt,
    KEY_LEN,
    SCRYPT_PARAMS
  );
  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  if (derivedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  const matched = crypto.timingSafeEqual(derivedBuffer, expectedBuffer);
  return storedHash ? matched : false;
}

export function hashOpaqueToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

export function toSafeUserDTO(row: DbUserRow, activeSessionCount?: number): SafeUserDTO {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.is_active === 1,
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLogin: row.last_login,
    activeSessionCount,
  };
}

export function recordSecurityAuditLog(params: {
  emailAttempted: string;
  userId?: string | null;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  details: string;
}): void {
  const stmt = db.prepare(`
    INSERT INTO login_audit_logs (
      id, timestamp, email_attempted, user_id, event_type, ip_address, user_agent, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    `LOG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    new Date().toISOString(),
    normalizeEmail(params.emailAttempted || 'anonymous'),
    params.userId ?? null,
    params.eventType,
    params.ipAddress.slice(0, 64),
    params.userAgent.slice(0, 256),
    params.details.slice(0, 500)
  );
}

// Seed initial datasheets & audits into server SQLite DB if empty
function seedApplicationDataIfNeeded(): void {
  const countRow = db
    .prepare('SELECT COUNT(*) as cnt FROM corpus_revisions')
    .get() as { cnt: number };
  if (countRow.cnt === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO corpus_revisions (id, model_code, revision, status, payload_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const item of SEED_DATASHEETS) {
      insertStmt.run(
        item.id,
        item.modelCode,
        item.revision,
        item.status,
        JSON.stringify(item),
        now
      );
    }
  }

  const auditCount = db
    .prepare('SELECT COUNT(*) as cnt FROM signoff_audits')
    .get() as { cnt: number };
  if (auditCount.cnt === 0) {
    const insertAudit = db.prepare(`
      INSERT INTO signoff_audits (
        id, owner_user_id, owner_email, model_code, revision, project_reference, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const rec of SEED_AUDIT_RECORDS) {
      insertAudit.run(
        rec.id,
        'system-seed',
        'system@spectrace.internal',
        rec.modelCode,
        rec.revision,
        rec.projectReference,
        JSON.stringify(rec),
        rec.timestamp
      );
    }
  }
}

// Optional env-configured initial admin bootstrap (no hardcoded credentials)
function bootstrapEnvAdminIfConfigured(): void {
  const envEmail = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const envPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  if (envEmail && envPassword && envEmail.includes('@') && envPassword.length >= 8) {
    const normEmail = normalizeEmail(envEmail);
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(normEmail) as { id: string } | undefined;
    const now = new Date().toISOString();
    const pwdHash = hashPassword(envPassword);

    if (!existing) {
      db.prepare(`
        INSERT INTO users (
          id, email, password_hash, role, is_active, failed_login_attempts, locked_until, created_at, updated_at, last_login
        ) VALUES (?, ?, ?, 'admin', 1, 0, NULL, ?, ?, NULL)
      `).run(crypto.randomUUID(), normEmail, pwdHash, now, now);
    } else {
      db.prepare(`
        UPDATE users SET password_hash = ?, role = 'admin', is_active = 1, updated_at = ? WHERE email = ?
      `).run(pwdHash, now, normEmail);
    }
  }
}

seedApplicationDataIfNeeded();
bootstrapEnvAdminIfConfigured();

export function getUserCount(): number {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as {
    cnt: number;
  };
  return row.cnt;
}

export function findUserByEmail(email: string): DbUserRow | undefined {
  const norm = normalizeEmail(email);
  return db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(norm) as DbUserRow | undefined;
}

export function findUserById(id: string): DbUserRow | undefined {
  return db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(id) as DbUserRow | undefined;
}

export function createAllowlistedUser(params: {
  email: string;
  passwordPlain: string;
  role: UserRole;
  isActive?: boolean;
}): SafeUserDTO {
  const normEmail = normalizeEmail(params.email);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const pwdHash = hashPassword(params.passwordPlain);
  const isActiveInt = params.isActive === false ? 0 : 1;

  db.prepare(`
    INSERT INTO users (
      id, email, password_hash, role, is_active, failed_login_attempts, locked_until, created_at, updated_at, last_login
    ) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, NULL)
  `).run(id, normEmail, pwdHash, params.role, isActiveInt, now, now);

  const created = findUserById(id)!;
  return toSafeUserDTO(created, 0);
}

export function listAllUsersForAdmin(): SafeUserDTO[] {
  const rows = db
    .prepare('SELECT * FROM users ORDER BY created_at ASC')
    .all() as unknown as DbUserRow[];
  const now = new Date().toISOString();

  return rows.map((row) => {
    const countRow = db
      .prepare(
        'SELECT COUNT(*) as cnt FROM sessions WHERE user_id = ? AND is_revoked = 0 AND expires_at > ?'
      )
      .get(row.id, now) as { cnt: number };
    return toSafeUserDTO(row, countRow.cnt);
  });
}

export function createServerSession(params: {
  userId: string;
  ipAddress: string;
  userAgent: string;
}): {
  sessionId: string;
  rawSessionToken: string;
  csrfToken: string;
  expiresAt: string;
} {
  const sessionId = crypto.randomUUID();
  const rawSessionToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashOpaqueToken(rawSessionToken);
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours max lifetime

  db.prepare(`
    INSERT INTO sessions (
      id, session_token_hash, csrf_token, user_id, ip_address, user_agent, created_at, expires_at, last_activity_at, is_revoked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    sessionId,
    tokenHash,
    csrfToken,
    params.userId,
    params.ipAddress.slice(0, 64),
    params.userAgent.slice(0, 256),
    now.toISOString(),
    expiresAt,
    now.toISOString()
  );

  return { sessionId, rawSessionToken, csrfToken, expiresAt };
}

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

export function verifySessionToken(rawToken: string): {
  valid: boolean;
  reason?: string;
  user?: DbUserRow;
  session?: DbSessionRow;
} {
  if (!rawToken || rawToken.length < 32) {
    return { valid: false, reason: 'Missing or malformed session token' };
  }
  const tokenHash = hashOpaqueToken(rawToken);
  const session = db
    .prepare('SELECT * FROM sessions WHERE session_token_hash = ?')
    .get(tokenHash) as DbSessionRow | undefined;

  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }
  if (session.is_revoked === 1) {
    return { valid: false, reason: 'Session has been revoked' };
  }

  const now = Date.now();
  if (new Date(session.expires_at).getTime() <= now) {
    db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?').run(
      session.id
    );
    return { valid: false, reason: 'Session expired' };
  }

  const lastActiveMs = new Date(session.last_activity_at).getTime();
  if (now - lastActiveMs > INACTIVITY_TIMEOUT_MS) {
    db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?').run(
      session.id
    );
    return { valid: false, reason: 'Session timed out due to inactivity' };
  }

  const user = findUserById(session.user_id);
  if (!user || user.is_active !== 1) {
    return { valid: false, reason: 'User account is disabled or deleted' };
  }

  // Sliding window activity update
  const nowIso = new Date(now).toISOString();
  db.prepare('UPDATE sessions SET last_activity_at = ? WHERE id = ?').run(
    nowIso,
    session.id
  );

  return { valid: true, user, session };
}

export function revokeSessionByToken(rawToken: string): void {
  const tokenHash = hashOpaqueToken(rawToken);
  db.prepare(
    'UPDATE sessions SET is_revoked = 1 WHERE session_token_hash = ?'
  ).run(tokenHash);
}

export function revokeAllUserSessions(userId: string): number {
  const result = db
    .prepare(
      'UPDATE sessions SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0'
    )
    .run(userId);
  return Number(result.changes || 0);
}

export function listRecentAuditLogs(limit = 50): AuditLogEntry[] {
  const rows = db
    .prepare(
      'SELECT * FROM login_audit_logs ORDER BY timestamp DESC LIMIT ?'
    )
    .all(limit) as unknown as Array<{
    id: string;
    timestamp: string;
    email_attempted: string;
    user_id: string | null;
    event_type: string;
    ip_address: string;
    user_agent: string;
    details: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    emailAttempted: r.email_attempted,
    userId: r.user_id,
    eventType: r.event_type,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    details: r.details,
  }));
}

// Application Data Helpers with Row-Level Access Control
export function getAllCorpusRevisions(): ProductRevision[] {
  const rows = db
    .prepare('SELECT payload_json FROM corpus_revisions ORDER BY updated_at DESC')
    .all() as unknown as Array<{ payload_json: string }>;
  return rows.map((r) => JSON.parse(r.payload_json) as ProductRevision);
}

export function saveCorpusRevision(revision: ProductRevision): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO corpus_revisions (id, model_code, revision, status, payload_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      model_code = excluded.model_code,
      revision = excluded.revision,
      status = excluded.status,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `).run(
    revision.id,
    revision.modelCode,
    revision.revision,
    revision.status,
    JSON.stringify(revision),
    now
  );
}

export function resetCorpusToSeed(): ProductRevision[] {
  db.exec('DELETE FROM corpus_revisions;');
  const now = new Date().toISOString();
  const insertStmt = db.prepare(`
    INSERT INTO corpus_revisions (id, model_code, revision, status, payload_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const item of SEED_DATASHEETS) {
    insertStmt.run(
      item.id,
      item.modelCode,
      item.revision,
      item.status,
      JSON.stringify(item),
      now
    );
  }
  return getAllCorpusRevisions();
}

export function listSignOffAuditsForUser(
  user: DbUserRow
): Array<SignOffAuditRecord & { ownerUserId: string; ownerEmail: string }> {
  // Row-Level Security (RLS) policy enforcement:
  // Admins can view all sign-off records; regular users can view only their own records + system seed reference.
  const rows =
    user.role === 'admin'
      ? (db
          .prepare(
            'SELECT owner_user_id, owner_email, payload_json FROM signoff_audits ORDER BY created_at DESC'
          )
          .all() as unknown as Array<{
          owner_user_id: string;
          owner_email: string;
          payload_json: string;
        }>)
      : (db
          .prepare(
            `SELECT owner_user_id, owner_email, payload_json
             FROM signoff_audits
             WHERE owner_user_id = ? OR owner_user_id = 'system-seed'
             ORDER BY created_at DESC`
          )
          .all(user.id) as unknown as Array<{
          owner_user_id: string;
          owner_email: string;
          payload_json: string;
        }>);

  return rows.map((r) => ({
    ...(JSON.parse(r.payload_json) as SignOffAuditRecord),
    ownerUserId: r.owner_user_id,
    ownerEmail: r.owner_email,
  }));
}

export function getSignOffAuditById(id: string): {
  id: string;
  ownerUserId: string;
  ownerEmail: string;
  record: SignOffAuditRecord;
} | null {
  const row = db
    .prepare(
      'SELECT id, owner_user_id, owner_email, payload_json FROM signoff_audits WHERE id = ?'
    )
    .get(id) as
    | {
        id: string;
        owner_user_id: string;
        owner_email: string;
        payload_json: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email,
    record: JSON.parse(row.payload_json) as SignOffAuditRecord,
  };
}

export function createSignOffAuditForUser(
  user: DbUserRow,
  record: SignOffAuditRecord
): SignOffAuditRecord & { ownerUserId: string; ownerEmail: string } {
  db.prepare(`
    INSERT INTO signoff_audits (
      id, owner_user_id, owner_email, model_code, revision, project_reference, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    user.id,
    user.email,
    record.modelCode,
    record.revision,
    record.projectReference,
    JSON.stringify(record),
    record.timestamp
  );
  return {
    ...record,
    ownerUserId: user.id,
    ownerEmail: user.email,
  };
}
