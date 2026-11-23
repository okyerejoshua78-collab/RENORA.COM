import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

export interface AuthenticatedUser {
  id: number | null;
  email: string;
  first_name: string;
  last_name: string;
  country: string;
  phone: string;
  preferred_currency: string;
  role: 'customer' | 'admin';
  email_verified: boolean;
  account_status: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
  authTokenHash?: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(derived, storedBuffer);
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateSecureToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
}

export function createSession(
  userId: number | null,
  role: 'customer' | 'admin',
  userAgent: string
): string {
  const { raw, hash } = generateSecureToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (id, user_id, role, expires_at, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).run(hash, userId, role, expiresAt, userAgent.slice(0, 200));
  return raw;
}

export function deleteSessionByRawToken(rawToken: string): void {
  const hash = hashToken(rawToken);
  db.prepare('DELETE FROM sessions WHERE id = ?').run(hash);
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function attachAuthIfPresent(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const rawToken = extractBearerToken(req);
  if (!rawToken) {
    next();
    return;
  }

  const tokenHash = hashToken(rawToken);
  const session = db
    .prepare('SELECT id, user_id, role, expires_at FROM sessions WHERE id = ?')
    .get(tokenHash) as { id: string; user_id: number | null; role: 'customer' | 'admin'; expires_at: string } | undefined;

  if (!session) {
    next();
    return;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(tokenHash);
    next();
    return;
  }

  if (session.user_id === null && session.role === 'admin') {
    req.authTokenHash = tokenHash;
    req.authUser = {
      id: null,
      email: 'admin@renora.local',
      first_name: 'Platform',
      last_name: 'Administrator',
      country: 'Ghana',
      phone: '',
      preferred_currency: 'GHS',
      role: 'admin',
      email_verified: true,
      account_status: 'active',
    };
    next();
    return;
  }

  if (session.user_id !== null) {
    const user = db
      .prepare(
        'SELECT id, first_name, last_name, email, country, phone, preferred_currency, role, email_verified, account_status FROM users WHERE id = ?'
      )
      .get(session.user_id) as
      | {
          id: number;
          first_name: string;
          last_name: string;
          email: string;
          country: string;
          phone: string;
          preferred_currency: string;
          role: 'customer' | 'admin';
          email_verified: number;
          account_status: string;
        }
      | undefined;

    if (user && user.account_status === 'active') {
      req.authTokenHash = tokenHash;
      req.authUser = {
        ...user,
        email_verified: Boolean(user.email_verified),
      };
    }
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser || req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required.' });
    return;
  }
  next();
}

export function getAdminPasscodeStatus(): {
  envConfigured: boolean;
  claimedHashConfigured: boolean;
  needsSetup: boolean;
} {
  const envPass = process.env.ADMIN_PASSCODE?.trim() ?? '';
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'").get() as
    | { value: string }
    | undefined;
  const envConfigured = envPass.length > 0;
  const claimedHashConfigured = Boolean(row?.value);
  return {
    envConfigured,
    claimedHashConfigured,
    needsSetup: !envConfigured && !claimedHashConfigured,
  };
}

export function verifyAdminPasscode(passcode: string): boolean {
  const envPass = process.env.ADMIN_PASSCODE?.trim() ?? '';
  if (envPass.length > 0) {
    const a = Buffer.from(passcode);
    const b = Buffer.from(envPass);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'").get() as
    | { value: string }
    | undefined;
  if (!row?.value) return false;
  return verifyPassword(passcode, row.value);
}
