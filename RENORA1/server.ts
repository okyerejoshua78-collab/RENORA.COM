import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { ZipArchive, type ArchiverError } from 'archiver';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase, logActivity } from './server/db.ts';
import {
  attachAuthIfPresent,
  createSession,
  deleteSessionByRawToken,
  extractBearerToken,
  generateSecureToken,
  getAdminPasscodeStatus,
  hashPassword,
  hashToken,
  requireAdmin,
  requireAuth,
  verifyAdminPasscode,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/auth.ts';
import { isSmtpConfigured, sendTransactionalEmail } from './server/email.ts';
import {
  capturePayPalOrder,
  convertFromUsd,
  createPayPalOrder,
  generateOrderReference,
  generateTicketCode,
  getPayPalMode,
  initializePaystackTransaction,
  isPayPalConfigured,
  isPaystackConfigured,
  verifyPaystackTransaction,
  type MobileNetwork,
  type PaymentMethod,
  type SupportedCurrency,
} from './server/payments.ts';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Trust reverse proxy headers in Cloud Run / reverse-proxied environments
app.set('trust proxy', 1);

const uploadDir = path.resolve(process.cwd(), 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// Security headers (iframe-compatible)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir));
app.use(attachAuthIfPresent);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes and try again.' },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again shortly.' },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many administrative requests. Please slow down.' },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests. Please wait a few minutes and try again.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const ALLOWED_COUNTRIES = new Set([
  'Ghana',
  'United States',
  'United Kingdom',
  'Canada',
  'Nigeria',
  'South Africa',
  'Germany',
  'Other International',
]);

const ALLOWED_CURRENCIES = new Set(['GHS', 'USD', 'GBP', 'CAD']);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function isSafeImageUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('/uploads/')) {
    return !trimmed.includes('..');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function detectImageExtension(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

function formatProductRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category_slug: row.category_slug,
    category_name: row.category_name ?? '',
    estimated_value_usd: row.estimated_value_usd,
    short_description: row.short_description,
    detailed_description: row.detailed_description,
    condition: row.condition,
    location: row.location,
    delivery_info: row.delivery_info,
    important_info: row.important_info,
    official_rules: row.official_rules,
    eligibility_countries: JSON.parse(String(row.eligibility_countries_json || '[]')),
    specs: JSON.parse(String(row.specs_json || '[]')),
    images: JSON.parse(String(row.images_json || '[]')),
    is_featured: Boolean(row.is_featured),
    is_sample: Boolean(row.is_sample),
    campaign_status: row.campaign_status,
    ticket_price_usd: Number(row.ticket_price_usd ?? 5),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getAppBaseUrl(req: express.Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL') {
    return configured.replace(/\/+$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

// ============================================================================
// PUBLIC HEALTH, CATALOG, ANNOUNCEMENTS, FAQ, CONTACT, PROJECT ZIP
// ============================================================================

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    paymentsEnabled: true,
    paystackConfigured: isPaystackConfigured(),
    paypalConfigured: isPayPalConfigured(),
    smtpConfigured: isSmtpConfigured(),
  });
});

app.get('/api/categories', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_slug = c.slug
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `)
    .all();
  res.json({ categories: rows });
});

app.get('/api/products', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const condition = typeof req.query.condition === 'string' ? req.query.condition.trim() : '';
  const featured = req.query.featured === '1' || req.query.featured === 'true';
  const maxValue = Number(req.query.maxValue || 0);
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'featured';

  const clauses: string[] = [];
  const params: unknown[] = [];

  if (q) {
    clauses.push('(p.name LIKE ? OR p.short_description LIKE ? OR p.location LIKE ? OR c.name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (category && category !== 'all') {
    clauses.push('p.category_slug = ?');
    params.push(category);
  }
  if (condition && condition !== 'all') {
    clauses.push('p.condition LIKE ?');
    params.push(`%${condition}%`);
  }
  if (featured) {
    clauses.push('p.is_featured = 1');
  }
  if (Number.isFinite(maxValue) && maxValue > 0) {
    clauses.push('p.estimated_value_usd <= ?');
    params.push(maxValue);
  }

  let orderBy = 'p.is_featured DESC, p.id ASC';
  if (sort === 'value-desc') orderBy = 'p.estimated_value_usd DESC';
  else if (sort === 'value-asc') orderBy = 'p.estimated_value_usd ASC';
  else if (sort === 'alpha') orderBy = 'p.name ASC';
  else if (sort === 'newest') orderBy = 'p.created_at DESC, p.id DESC';

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON c.slug = p.category_slug
    ${whereSql}
    ORDER BY ${orderBy}
  `;

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  res.json({ products: rows.map(formatProductRow) });
});

app.get('/api/products/:slug', (req, res) => {
  const row = db
    .prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.slug = p.category_slug
      WHERE p.slug = ?
    `)
    .get(req.params.slug) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const product = formatProductRow(row);
  const faqs = db
    .prepare('SELECT id, product_id, question, answer FROM faqs WHERE product_id = ? OR product_id IS NULL ORDER BY product_id DESC, sort_order ASC')
    .all(row.id);

  res.json({ product, faqs });
});

app.get('/api/announcements', (_req, res) => {
  const rows = db
    .prepare('SELECT id, title, summary, body, market_scope, published_at FROM announcements WHERE is_published = 1 ORDER BY published_at DESC, id DESC')
    .all();
  res.json({ announcements: rows });
});

app.get('/api/faqs', (_req, res) => {
  const rows = db
    .prepare('SELECT id, product_id, question, answer, sort_order FROM faqs WHERE product_id IS NULL ORDER BY sort_order ASC, id ASC')
    .all();
  res.json({ faqs: rows });
});

app.post('/api/contact', contactLimiter, (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const country = typeof req.body?.country === 'string' ? req.body.country.trim() : 'Ghana';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  if (name.length < 2 || name.length > 120) {
    res.status(400).json({ error: 'Please provide your full name (2–120 characters).' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  if (subject.length < 3 || subject.length > 150) {
    res.status(400).json({ error: 'Please enter a short subject line.' });
    return;
  }
  if (message.length < 10 || message.length > 3000) {
    res.status(400).json({ error: 'Please enter a message of at least 10 characters.' });
    return;
  }

  db.prepare(`
    INSERT INTO contact_messages (name, email, country, subject, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email, country, subject, message);

  logActivity({
    actorEmail: email,
    action: 'contact_message_submitted',
    targetType: 'contact_message',
    details: subject,
  });

  res.status(201).json({
    message: 'Thank you for contacting RENORA. Your inquiry has been securely recorded for review.',
  });
});

// Downloadable Complete Project ZIP
app.get('/api/download-project', (_req, res) => {
  const rootDir = process.cwd();
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="renora-website-source.zip"');

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on('error', (err: ArchiverError) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not generate source archive.' });
    }
  });

  archive.pipe(res);

  const excludedDirs = new Set(['node_modules', 'dist', '.git', '.aistudio', 'data']);
  const addDirToArchive = (dir: string, relBase = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (excludedDirs.has(entry.name) || relPath === 'public/uploads') continue;
        addDirToArchive(fullPath, relPath);
      } else if (entry.isFile()) {
        if (entry.name === '.env' || (entry.name.startsWith('.env.') && entry.name !== '.env.example')) {
          continue;
        }
        archive.file(fullPath, { name: relPath });
      }
    }
  };

  addDirToArchive(rootDir);
  archive.finalize();
});

// ============================================================================
// CUSTOMER AUTHENTICATION & ACCOUNT ROUTES
// ============================================================================

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const firstName = typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : '';
    const lastName = typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const country = typeof req.body?.country === 'string' ? req.body.country.trim() : 'Ghana';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

    if (firstName.length < 1 || lastName.length < 1 || firstName.length > 80 || lastName.length > 80) {
      res.status(400).json({ error: 'First name and last name are required.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!ALLOWED_COUNTRIES.has(country)) {
      res.status(400).json({ error: 'Please select a valid country.' });
      return;
    }
    if (phone && !/^[+0-9()\-\s]{6,24}$/.test(phone)) {
      res.status(400).json({ error: 'Please enter a valid international phone number or leave it blank.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const currencyMap: Record<string, string> = {
      Ghana: 'GHS',
      'United States': 'USD',
      'United Kingdom': 'GBP',
      Canada: 'CAD',
    };
    const preferredCurrency = currencyMap[country] || 'USD';
    const passwordHash = hashPassword(password);
    const verification = generateSecureToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const result = db
      .prepare(`
        INSERT INTO users (
          first_name, last_name, email, country, phone, preferred_currency,
          password_hash, role, email_verified, verification_token_hash, verification_expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'customer', 0, ?, ?)
      `)
      .run(
        firstName,
        lastName,
        email,
        country,
        phone,
        preferredCurrency,
        passwordHash,
        verification.hash,
        verificationExpiresAt
      );

    const userId = Number(result.lastInsertRowid);

    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `).run(
      userId,
      'Welcome to RENORA',
      'Your customer account is active. You can browse products and purchase tickets via Visa, Bank Transfer, Ghana Mobile Money, or PayPal.'
    );

    const verifyUrl = `${getAppBaseUrl(req)}/verify-email?token=${verification.raw}`;
    const mailResult = await sendTransactionalEmail({
      to: email,
      subject: 'Verify your RENORA account email',
      text: `Hello ${firstName},\n\nWelcome to RENORA — More Possibilities, Less Spending.\n\nPlease verify your email address using this link (valid for 24 hours):\n${verifyUrl}\n\nThank you for joining RENORA.`,
      html: `<p>Hello ${firstName},</p><p>Welcome to <strong>RENORA</strong> — <em>More Possibilities, Less Spending.</em></p><p><a href="${verifyUrl}">Verify your email address</a> (valid for 24 hours).</p><p>Thank you for joining RENORA.</p>`,
    });

    const token = createSession(userId, 'customer', req.headers['user-agent'] || '');

    logActivity({
      actorUserId: userId,
      actorEmail: email,
      action: 'customer_registered',
      targetType: 'user',
      targetId: String(userId),
      details: country,
    });

    res.status(201).json({
      token,
      user: {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
        country,
        phone,
        preferred_currency: preferredCurrency,
        role: 'customer',
        email_verified: false,
        account_status: 'active',
      },
      emailDeliveryMode: mailResult.mode,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Unable to create account right now.' });
  }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!isValidEmail(email) || !password) {
    res.status(400).json({ error: 'Please provide both email and password.' });
    return;
  }

  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email) as
    | {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        country: string;
        phone: string;
        preferred_currency: string;
        password_hash: string;
        role: 'customer' | 'admin';
        email_verified: number;
        account_status: string;
      }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email address or password.' });
    return;
  }

  if (user.account_status !== 'active') {
    res.status(403).json({ error: 'This account is currently suspended. Please contact support.' });
    return;
  }

  const token = createSession(user.id, user.role, req.headers['user-agent'] || '');

  logActivity({
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'customer_signed_in',
    targetType: 'user',
    targetId: String(user.id),
  });

  res.json({
    token,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      country: user.country,
      phone: user.phone,
      preferred_currency: user.preferred_currency,
      role: user.role,
      email_verified: Boolean(user.email_verified),
      account_status: user.account_status,
    },
  });
});

app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
  const rawToken = extractBearerToken(req);
  if (rawToken) {
    deleteSessionByRawToken(rawToken);
  }
  res.json({ message: 'Signed out successfully.' });
});

app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
  if (!req.authUser) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  res.json({ user: req.authUser });
});

app.post('/api/auth/verify-email', authLimiter, (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token || token.length < 20) {
    res.status(400).json({ error: 'Invalid or missing verification token.' });
    return;
  }

  const tokenHash = hashToken(token);
  const user = db
    .prepare('SELECT id, email, verification_expires_at FROM users WHERE verification_token_hash = ?')
    .get(tokenHash) as { id: number; email: string; verification_expires_at: string | null } | undefined;

  if (!user) {
    res.status(400).json({ error: 'Verification link is invalid or has already been used.' });
    return;
  }

  if (user.verification_expires_at && new Date(user.verification_expires_at).getTime() < Date.now()) {
    res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    return;
  }

  db.prepare(`
    UPDATE users
    SET email_verified = 1, verification_token_hash = NULL, verification_expires_at = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(user.id);

  logActivity({
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'email_verified',
    targetType: 'user',
    targetId: String(user.id),
  });

  res.json({ message: 'Your email address has been verified.' });
});

app.post('/api/auth/resend-verification', authLimiter, requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.authUser || req.authUser.id === null) {
    res.status(400).json({ error: 'Cannot resend verification for this account type.' });
    return;
  }

  if (req.authUser.email_verified) {
    res.json({ message: 'Your email address is already verified.' });
    return;
  }

  const verification = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    UPDATE users
    SET verification_token_hash = ?, verification_expires_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(verification.hash, expiresAt, req.authUser.id);

  const verifyUrl = `${getAppBaseUrl(req)}/verify-email?token=${verification.raw}`;
  const mailResult = await sendTransactionalEmail({
    to: req.authUser.email,
    subject: 'Verify your RENORA account email',
    text: `Hello ${req.authUser.first_name},\n\nClick the link below to verify your email address (valid for 24 hours):\n${verifyUrl}`,
    html: `<p>Hello ${req.authUser.first_name},</p><p><a href="${verifyUrl}">Click here to verify your email address</a> (valid for 24 hours).</p>`,
  });

  res.json({
    message:
      mailResult.mode === 'smtp'
        ? 'A new verification email has been sent to your inbox.'
        : 'Verification email generated via local preview service. Check the server terminal output for your verification link.',
    emailDeliveryMode: mailResult.mode,
  });
});

app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }

  const user = db
    .prepare('SELECT id, first_name, email FROM users WHERE email = ?')
    .get(email) as { id: number; first_name: string; email: string } | undefined;

  if (user) {
    const reset = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`
      UPDATE users
      SET reset_token_hash = ?, reset_expires_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(reset.hash, expiresAt, user.id);

    const resetUrl = `${getAppBaseUrl(req)}/reset-password?token=${reset.raw}`;
    await sendTransactionalEmail({
      to: user.email,
      subject: 'RENORA Password Reset Request',
      text: `Hello ${user.first_name},\n\nWe received a request to reset your RENORA password. Use this one-time link within 60 minutes:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
      html: `<p>Hello ${user.first_name},</p><p>Use this one-time link within 60 minutes to reset your RENORA password:</p><p><a href="${resetUrl}">Reset Password</a></p>`,
    });

    logActivity({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'password_reset_requested',
      targetType: 'user',
      targetId: String(user.id),
    });
  }

  res.json({
    message:
      'If an account is registered with that email, password reset instructions have been dispatched via the configured email service.',
    smtpConfigured: isSmtpConfigured(),
  });
});

app.post('/api/auth/reset-password', authLimiter, (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

  if (!token || token.length < 20) {
    res.status(400).json({ error: 'Invalid or missing password reset token.' });
    return;
  }
  if (password.length < 8 || password.length > 128) {
    res.status(400).json({ error: 'New password must be between 8 and 128 characters.' });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }

  const tokenHash = hashToken(token);
  const user = db
    .prepare('SELECT id, email, reset_expires_at FROM users WHERE reset_token_hash = ?')
    .get(tokenHash) as { id: number; email: string; reset_expires_at: string | null } | undefined;

  if (!user || !user.reset_expires_at || new Date(user.reset_expires_at).getTime() < Date.now()) {
    res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
    return;
  }

  const newHash = hashPassword(password);
  db.prepare(`
    UPDATE users
    SET password_hash = ?, reset_token_hash = NULL, reset_expires_at = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(newHash, user.id);

  // Invalidate existing sessions after password reset
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

  logActivity({
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'password_reset_completed',
    targetType: 'user',
    targetId: String(user.id),
  });

  res.json({ message: 'Your password has been reset. You may now sign in with your new password.' });
});

app.patch('/api/account/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.authUser || req.authUser.id === null) {
    res.status(400).json({ error: 'Profile updates are available for customer accounts.' });
    return;
  }

  const firstName = typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : '';
  const lastName = typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : '';
  const country = typeof req.body?.country === 'string' ? req.body.country.trim() : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  const preferredCurrency =
    typeof req.body?.preferredCurrency === 'string' ? req.body.preferredCurrency.trim() : '';

  if (firstName.length < 1 || lastName.length < 1) {
    res.status(400).json({ error: 'First and last name cannot be empty.' });
    return;
  }
  if (!ALLOWED_COUNTRIES.has(country)) {
    res.status(400).json({ error: 'Invalid country selection.' });
    return;
  }
  if (!ALLOWED_CURRENCIES.has(preferredCurrency)) {
    res.status(400).json({ error: 'Invalid currency selection.' });
    return;
  }
  if (phone && !/^[+0-9()\-\s]{6,24}$/.test(phone)) {
    res.status(400).json({ error: 'Please enter a valid international phone number.' });
    return;
  }

  db.prepare(`
    UPDATE users
    SET first_name = ?, last_name = ?, country = ?, phone = ?, preferred_currency = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(firstName, lastName, country, phone, preferredCurrency, req.authUser.id);

  logActivity({
    actorUserId: req.authUser.id,
    actorEmail: req.authUser.email,
    action: 'profile_updated',
    targetType: 'user',
    targetId: String(req.authUser.id),
  });

  res.json({
    user: {
      ...req.authUser,
      first_name: firstName,
      last_name: lastName,
      country,
      phone,
      preferred_currency: preferredCurrency,
    },
  });
});

app.post('/api/account/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.authUser || req.authUser.id === null) {
    res.status(400).json({ error: 'Password changes are available for registered user accounts.' });
    return;
  }

  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

  if (newPassword.length < 8 || newPassword.length > 128) {
    res.status(400).json({ error: 'New password must be between 8 and 128 characters.' });
    return;
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'New passwords do not match.' });
    return;
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.authUser.id) as
    | { password_hash: string }
    | undefined;
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  const newHash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
    newHash,
    req.authUser.id
  );

  logActivity({
    actorUserId: req.authUser.id,
    actorEmail: req.authUser.email,
    action: 'password_changed',
    targetType: 'user',
    targetId: String(req.authUser.id),
  });

  res.json({ message: 'Your password has been updated.' });
});

app.get('/api/account/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const notifications =
    req.authUser?.id !== null
      ? db
          .prepare('SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20')
          .all(req.authUser!.id)
      : [];
  const announcements = db
    .prepare('SELECT id, title, summary, body, market_scope, published_at FROM announcements WHERE is_published = 1 ORDER BY id DESC LIMIT 10')
    .all();

  res.json({ notifications, announcements });
});

app.post('/api/account/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.authUser || req.authUser.id === null) {
    res.status(400).json({ error: 'Unsupported for this account type.' });
    return;
  }
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
    Number(req.params.id),
    req.authUser.id
  );
  res.json({ ok: true });
});

// ============================================================================
// ADMINISTRATOR AUTH & MANAGEMENT ROUTES
// ============================================================================

app.get('/api/admin/status', (_req, res) => {
  const status = getAdminPasscodeStatus();
  res.json({
    needsSetup: status.needsSetup,
    envConfigured: status.envConfigured,
    smtpConfigured: isSmtpConfigured(),
  });
});

app.post('/api/admin/setup', authLimiter, (req, res) => {
  const status = getAdminPasscodeStatus();
  if (!status.needsSetup) {
    res.status(409).json({ error: 'Administrator passcode is already configured.' });
    return;
  }

  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
  const confirmPasscode = typeof req.body?.confirmPasscode === 'string' ? req.body.confirmPasscode : '';

  if (passcode.length < 10 || passcode.length > 128) {
    res.status(400).json({ error: 'Administrator passcode must be at least 10 characters.' });
    return;
  }
  if (passcode !== confirmPasscode) {
    res.status(400).json({ error: 'Passcodes do not match.' });
    return;
  }

  const hashed = hashPassword(passcode);
  const insertResult = db
    .prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('admin_passcode_hash', ?)")
    .run(hashed);

  if (insertResult.changes === 0) {
    res.status(409).json({ error: 'Administrator passcode has already been claimed.' });
    return;
  }

  const token = createSession(null, 'admin', req.headers['user-agent'] || '');
  logActivity({
    actorEmail: 'admin@renora.local',
    action: 'admin_passcode_claimed',
    targetType: 'app_settings',
  });

  res.status(201).json({
    token,
    user: {
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
    },
  });
});

app.post('/api/admin/login', authLimiter, (req, res) => {
  const status = getAdminPasscodeStatus();
  if (status.needsSetup) {
    res.status(400).json({ error: 'Administrator passcode has not been set up yet.' });
    return;
  }

  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
  if (!passcode || !verifyAdminPasscode(passcode)) {
    res.status(401).json({ error: 'Invalid administrator passcode.' });
    return;
  }

  const token = createSession(null, 'admin', req.headers['user-agent'] || '');
  logActivity({
    actorEmail: 'admin@renora.local',
    action: 'admin_signed_in',
    targetType: 'session',
  });

  res.json({
    token,
    user: {
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
    },
  });
});

app.get('/api/admin/overview', adminLimiter, requireAdmin, (_req, res) => {
  const productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  const categoryCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  const customerCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer'").get() as { c: number }).c;
  const verifiedCustomers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer' AND email_verified = 1").get() as { c: number }).c;
  const messageCount = (db.prepare('SELECT COUNT(*) as c FROM contact_messages').get() as { c: number }).c;
  const announcementCount = (db.prepare('SELECT COUNT(*) as c FROM announcements').get() as { c: number }).c;

  res.json({
    stats: {
      products: productCount,
      categories: categoryCount,
      customers: customerCount,
      verifiedCustomers,
      messages: messageCount,
      announcements: announcementCount,
      participationEnabled: true,
      smtpConfigured: isSmtpConfigured(),
    },
  });
});

app.post('/api/admin/upload', adminLimiter, requireAdmin, upload.single('image'), (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided.' });
    return;
  }

  const ext = detectImageExtension(req.file.buffer);
  if (!ext) {
    res.status(400).json({ error: 'Unsupported image format. Upload JPEG, PNG, or WebP.' });
    return;
  }

  const fileName = `renora-${crypto.randomUUID()}.${ext}`;
  const targetPath = path.resolve(uploadDir, fileName);
  if (!targetPath.startsWith(uploadDir + path.sep)) {
    res.status(400).json({ error: 'Invalid target file path.' });
    return;
  }

  fs.writeFileSync(targetPath, req.file.buffer);

  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'image_uploaded',
    targetType: 'media',
    targetId: fileName,
  });

  res.status(201).json({ url: `/uploads/${fileName}` });
});

app.post('/api/admin/products', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const slug = sanitizeSlug(typeof b.slug === 'string' && b.slug.trim() ? b.slug : name);
  const categorySlug = typeof b.category_slug === 'string' ? b.category_slug.trim() : '';
  const estimatedValueUsd = Number(b.estimated_value_usd);
  const shortDescription = typeof b.short_description === 'string' ? b.short_description.trim() : '';
  const detailedDescription = typeof b.detailed_description === 'string' ? b.detailed_description.trim() : '';
  const condition = typeof b.condition === 'string' ? b.condition.trim() : 'Brand New / Sample Specification';
  const location = typeof b.location === 'string' ? b.location.trim() : 'Accra, Ghana';
  const deliveryInfo = typeof b.delivery_info === 'string' ? b.delivery_info.trim() : '';
  const importantInfo = typeof b.important_info === 'string' ? b.important_info.trim() : '';
  const officialRules = typeof b.official_rules === 'string' ? b.official_rules.trim() : '';
  const eligibilityCountries = Array.isArray(b.eligibility_countries) ? b.eligibility_countries : ['Ghana'];
  const specs = Array.isArray(b.specs) ? b.specs : [];
  const images = Array.isArray(b.images) ? b.images.filter(isSafeImageUrl) : [];
  const isFeatured = b.is_featured ? 1 : 0;
  const ticketPriceUsd = Number(b.ticket_price_usd) > 0 ? Number(b.ticket_price_usd) : 5;

  if (!name || !slug || !categorySlug || !Number.isFinite(estimatedValueUsd) || estimatedValueUsd <= 0) {
    res.status(400).json({ error: 'Product name, valid category, and positive USD value are required.' });
    return;
  }

  const categoryExists = db.prepare('SELECT slug FROM categories WHERE slug = ?').get(categorySlug);
  if (!categoryExists) {
    res.status(400).json({ error: 'Selected category does not exist.' });
    return;
  }

  const slugExists = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  const finalSlug = slugExists ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

  const result = db
    .prepare(`
      INSERT INTO products (
        slug, name, category_slug, estimated_value_usd, short_description,
        detailed_description, condition, location, delivery_info, important_info,
        official_rules, eligibility_countries_json, specs_json, images_json,
        is_featured, is_sample, campaign_status, ticket_price_usd
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ticket_sales_enabled', ?)
    `)
    .run(
      finalSlug,
      name,
      categorySlug,
      Math.round(estimatedValueUsd),
      shortDescription || name,
      detailedDescription || shortDescription || name,
      condition,
      location,
      deliveryInfo || 'Coordinated fulfillment in Ghana and approved international regions.',
      importantInfo || 'Verify eligibility and official campaign rules before purchasing tickets.',
      officialRules || 'Draft official rules framework. Subject to local regulatory compliance.',
      JSON.stringify(eligibilityCountries),
      JSON.stringify(specs),
      JSON.stringify(images),
      isFeatured,
      Number(ticketPriceUsd.toFixed(2))
    );

  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'product_created',
    targetType: 'product',
    targetId: String(result.lastInsertRowid),
    details: name,
  });

  res.status(201).json({ id: Number(result.lastInsertRowid), slug: finalSlug });
});

app.put('/api/admin/products/:id', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const b = req.body ?? {};
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const categorySlug = typeof b.category_slug === 'string' ? b.category_slug.trim() : '';
  const estimatedValueUsd = Number(b.estimated_value_usd);
  const shortDescription = typeof b.short_description === 'string' ? b.short_description.trim() : '';
  const detailedDescription = typeof b.detailed_description === 'string' ? b.detailed_description.trim() : '';
  const condition = typeof b.condition === 'string' ? b.condition.trim() : 'Brand New';
  const location = typeof b.location === 'string' ? b.location.trim() : 'Accra, Ghana';
  const deliveryInfo = typeof b.delivery_info === 'string' ? b.delivery_info.trim() : '';
  const importantInfo = typeof b.important_info === 'string' ? b.important_info.trim() : '';
  const officialRules = typeof b.official_rules === 'string' ? b.official_rules.trim() : '';
  const eligibilityCountries = Array.isArray(b.eligibility_countries) ? b.eligibility_countries : ['Ghana'];
  const specs = Array.isArray(b.specs) ? b.specs : [];
  const images = Array.isArray(b.images) ? b.images.filter(isSafeImageUrl) : [];
  const isFeatured = b.is_featured ? 1 : 0;
  const ticketPriceUsd = Number(b.ticket_price_usd) > 0 ? Number(b.ticket_price_usd) : 5;

  if (!name || !categorySlug || !Number.isFinite(estimatedValueUsd) || estimatedValueUsd <= 0) {
    res.status(400).json({ error: 'Valid name, category, and estimated value are required.' });
    return;
  }

  db.prepare(`
    UPDATE products
    SET name = ?, category_slug = ?, estimated_value_usd = ?, short_description = ?,
        detailed_description = ?, condition = ?, location = ?, delivery_info = ?,
        important_info = ?, official_rules = ?, eligibility_countries_json = ?,
        specs_json = ?, images_json = ?, is_featured = ?, ticket_price_usd = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name,
    categorySlug,
    Math.round(estimatedValueUsd),
    shortDescription,
    detailedDescription,
    condition,
    location,
    deliveryInfo,
    importantInfo,
    officialRules,
    JSON.stringify(eligibilityCountries),
    JSON.stringify(specs),
    JSON.stringify(images),
    isFeatured,
    Number(ticketPriceUsd.toFixed(2)),
    id
  );

  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'product_updated',
    targetType: 'product',
    targetId: String(id),
    details: name,
  });

  res.json({ ok: true });
});

app.delete('/api/admin/products/:id', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT name FROM products WHERE id = ?').get(id) as { name: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'product_deleted',
    targetType: 'product',
    targetId: String(id),
    details: existing.name,
  });

  res.json({ ok: true });
});

app.post('/api/admin/categories', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const slug = sanitizeSlug(typeof req.body?.slug === 'string' && req.body.slug.trim() ? req.body.slug : name);

  if (!name || !slug) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }

  const exists = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (exists) {
    res.status(409).json({ error: 'A category with that slug already exists.' });
    return;
  }

  const maxSort = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM categories').get() as { m: number }).m;
  const result = db
    .prepare('INSERT INTO categories (slug, name, description, sort_order) VALUES (?, ?, ?, ?)')
    .run(slug, name, description || `${name} products curated by RENORA.`, maxSort + 1);

  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'category_created',
    targetType: 'category',
    targetId: String(result.lastInsertRowid),
    details: name,
  });

  res.status(201).json({ id: Number(result.lastInsertRowid), slug });
});

app.put('/api/admin/categories/:id', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }

  db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description, id);
  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'category_updated',
    targetType: 'category',
    targetId: String(id),
    details: name,
  });

  res.json({ ok: true });
});

app.get('/api/admin/customers', adminLimiter, requireAdmin, (_req, res) => {
  const rows = db
    .prepare(`
      SELECT id, first_name, last_name, email, country, phone, preferred_currency,
             role, email_verified, account_status, created_at
      FROM users
      ORDER BY id DESC
    `)
    .all() as Record<string, unknown>[];

  res.json({
    customers: rows.map((u) => ({
      ...u,
      email_verified: Boolean(u.email_verified),
    })),
  });
});

app.patch('/api/admin/customers/:id', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const accountStatus = req.body?.account_status;
  const emailVerified = req.body?.email_verified;

  if (accountStatus !== undefined && accountStatus !== 'active' && accountStatus !== 'suspended') {
    res.status(400).json({ error: 'Invalid account status.' });
    return;
  }

  if (accountStatus !== undefined) {
    db.prepare("UPDATE users SET account_status = ?, updated_at = datetime('now') WHERE id = ?").run(accountStatus, id);
  }
  if (typeof emailVerified === 'boolean') {
    db.prepare("UPDATE users SET email_verified = ?, updated_at = datetime('now') WHERE id = ?").run(
      emailVerified ? 1 : 0,
      id
    );
  }

  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'customer_updated',
    targetType: 'user',
    targetId: String(id),
  });

  res.json({ ok: true });
});

app.get('/api/admin/announcements', adminLimiter, requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all();
  res.json({ announcements: rows });
});

app.post('/api/admin/announcements', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  const marketScope = typeof req.body?.market_scope === 'string' ? req.body.market_scope.trim() : 'Global';

  if (!title || !summary || !body) {
    res.status(400).json({ error: 'Title, summary, and full announcement body are required.' });
    return;
  }

  const result = db
    .prepare('INSERT INTO announcements (title, summary, body, market_scope, is_published) VALUES (?, ?, ?, ?, 1)')
    .run(title, summary, body, marketScope);

  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'announcement_published',
    targetType: 'announcement',
    targetId: String(result.lastInsertRowid),
    details: title,
  });

  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

app.patch('/api/admin/announcements/:id', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const isPublished = req.body?.is_published ? 1 : 0;
  db.prepare('UPDATE announcements SET is_published = ? WHERE id = ?').run(isPublished, id);
  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'announcement_toggled',
    targetType: 'announcement',
    targetId: String(id),
  });
  res.json({ ok: true });
});

app.delete('/api/admin/announcements/:id', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'announcement_deleted',
    targetType: 'announcement',
    targetId: String(id),
  });
  res.json({ ok: true });
});

app.get('/api/admin/faqs', adminLimiter, requireAdmin, (_req, res) => {
  const rows = db
    .prepare('SELECT f.*, p.name as product_name FROM faqs f LEFT JOIN products p ON p.id = f.product_id ORDER BY f.sort_order ASC, f.id DESC')
    .all();
  res.json({ faqs: rows });
});

app.post('/api/admin/faqs', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : '';
  const productId = req.body?.product_id ? Number(req.body.product_id) : null;

  if (!question || !answer) {
    res.status(400).json({ error: 'Question and answer are required.' });
    return;
  }

  const maxSort = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM faqs').get() as { m: number }).m;
  const result = db
    .prepare('INSERT INTO faqs (product_id, question, answer, sort_order) VALUES (?, ?, ?, ?)')
    .run(productId, question, answer, maxSort + 1);

  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'faq_created',
    targetType: 'faq',
    targetId: String(result.lastInsertRowid),
  });

  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

app.delete('/api/admin/faqs/:id', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM faqs WHERE id = ?').run(id);
  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'faq_deleted',
    targetType: 'faq',
    targetId: String(id),
  });
  res.json({ ok: true });
});

app.get('/api/admin/messages', adminLimiter, requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 100').all();
  res.json({ messages: rows });
});

app.get('/api/admin/activity', adminLimiter, requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 100').all();
  res.json({ logs: rows });
});

// ============================================================================
// PAYMENTS, TICKETS & SETTLEMENT CONFIGURATION
// ============================================================================

function getSettlementSettings(): Record<string, string> {
  const keys = [
    'bank_name',
    'bank_account_name',
    'bank_account_number',
    'bank_swift_code',
    'momo_merchant_name',
    'momo_mtn_number',
    'momo_vodafone_number',
    'momo_tigo_number',
  ];
  const rows = db.prepare('SELECT key, value FROM app_settings WHERE key IN (' + keys.map(() => '?').join(',') + ')').all(
    ...keys
  ) as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

function issueTicketsForOrder(orderId: number, userId: number, productId: number, quantity: number, status: 'pending' | 'active' | 'sandbox'): string[] {
  const insertTicket = db.prepare(`
    INSERT INTO tickets (ticket_code, order_id, user_id, product_id, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  const codes: string[] = [];
  for (let i = 0; i < quantity; i++) {
    const code = generateTicketCode();
    insertTicket.run(code, orderId, userId, productId, status);
    codes.push(code);
  }
  return codes;
}

app.get('/api/payments/config', (_req, res) => {
  res.json({
    paystackConfigured: isPaystackConfigured(),
    paypalConfigured: isPayPalConfigured(),
    paypalMode: getPayPalMode(),
    settlement: getSettlementSettings(),
    supportedMethods: [
      { id: 'visa_card', label: 'Visa Card', region: 'Global & Ghana' },
      { id: 'mobile_money', label: 'Ghana Mobile Money (MTN · Vodafone · Tigo)', region: 'Ghana' },
      { id: 'bank_transfer', label: 'Bank Transfer', region: 'Ghana & International' },
      { id: 'paypal', label: 'PayPal', region: 'International' },
    ],
  });
});

app.post('/api/payments/checkout', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.authUser || req.authUser.id === null) {
      res.status(400).json({ error: 'Please sign in with a customer account to purchase tickets.' });
      return;
    }

    const b = req.body ?? {};
    const productId = Number(b.productId);
    const quantity = Number(b.quantity);
    const currencyRaw = typeof b.currency === 'string' ? b.currency.trim().toUpperCase() : 'GHS';
    const paymentMethod = typeof b.paymentMethod === 'string' ? b.paymentMethod.trim() : '';

    if (!Number.isInteger(productId) || productId <= 0) {
      res.status(400).json({ error: 'Invalid product selected.' });
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      res.status(400).json({ error: 'Ticket quantity must be between 1 and 50.' });
      return;
    }
    if (!ALLOWED_CURRENCIES.has(currencyRaw)) {
      res.status(400).json({ error: 'Unsupported currency.' });
      return;
    }
    if (!['visa_card', 'bank_transfer', 'mobile_money', 'paypal'].includes(paymentMethod)) {
      res.status(400).json({ error: 'Unsupported payment method.' });
      return;
    }

    const product = db
      .prepare('SELECT id, name, slug, ticket_price_usd FROM products WHERE id = ?')
      .get(productId) as { id: number; name: string; slug: string; ticket_price_usd: number } | undefined;

    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const currency = currencyRaw as SupportedCurrency;
    const unitPriceUsd = Number(product.ticket_price_usd || 5);
    const totalUsd = Number((unitPriceUsd * quantity).toFixed(2));
    const displayAmount = convertFromUsd(totalUsd, currency);
    const amountGhs = convertFromUsd(totalUsd, 'GHS');
    const orderReference = generateOrderReference();
    const userId = req.authUser.id;
    const baseUrl = getAppBaseUrl(req);

    // 1. VISA CARD
    if (paymentMethod === 'visa_card') {
      const cardholderName = typeof b.cardholderName === 'string' ? b.cardholderName.trim() : '';
      const last4 = typeof b.last4 === 'string' ? b.last4.replace(/\D/g, '').slice(-4) : '';

      if (isPaystackConfigured()) {
        const orderRes = db
          .prepare(`
            INSERT INTO payment_orders (
              order_reference, user_id, product_id, quantity, unit_price_usd, total_usd,
              display_currency, display_amount, payment_method, provider_name, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'visa_card', 'paystack', 'pending', ?)
          `)
          .run(orderReference, userId, product.id, quantity, unitPriceUsd, totalUsd, currency, displayAmount, 'Paystack Visa checkout initiated');

        const init = await initializePaystackTransaction({
          email: req.authUser.email,
          amountGhs,
          reference: orderReference,
          callbackUrl: `${baseUrl}/checkout/callback?provider=paystack`,
          channels: ['card'],
          metadata: { orderId: Number(orderRes.lastInsertRowid), productId: product.id, quantity },
        });

        res.status(201).json({
          mode: 'redirect',
          provider: 'paystack',
          orderReference,
          authorizationUrl: init.authorizationUrl,
        });
        return;
      }

      if (cardholderName.length < 2) {
        res.status(400).json({ error: 'Please enter the cardholder name for the Visa test receipt.' });
        return;
      }

      const txResult = db.transaction(() => {
        const orderRes = db
          .prepare(`
            INSERT INTO payment_orders (
              order_reference, user_id, product_id, quantity, unit_price_usd, total_usd,
              display_currency, display_amount, payment_method, provider_name, provider_reference, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'visa_card', 'sandbox', ?, 'sandbox_paid', ?)
          `)
          .run(
            orderReference,
            userId,
            product.id,
            quantity,
            unitPriceUsd,
            totalUsd,
            currency,
            displayAmount,
            `VISA-${last4 || '4242'}`,
            `Sandbox Visa test payment (${cardholderName})`
          );
        const orderId = Number(orderRes.lastInsertRowid);
        const tickets = issueTicketsForOrder(orderId, userId, product.id, quantity, 'sandbox');
        db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
          userId,
          `Sandbox Tickets Issued (${orderReference})`,
          `${quantity} test ticket(s) issued for ${product.name} via Visa Sandbox mode.`
        );
        return { orderId, tickets };
      })();

      logActivity({
        actorUserId: userId,
        actorEmail: req.authUser.email,
        action: 'ticket_order_sandbox_visa',
        targetType: 'payment_order',
        targetId: orderReference,
        details: `${quantity}x ${product.name}`,
      });

      res.status(201).json({
        mode: 'completed',
        status: 'sandbox_paid',
        orderReference,
        tickets: txResult.tickets,
        message: 'Sandbox Visa test payment recorded and test tickets issued. Configure PAYSTACK_SECRET_KEY in .env for live Visa processing.',
      });
      return;
    }

    // 2. GHANA MOBILE MONEY (MTN, VODAFONE, TIGO)
    if (paymentMethod === 'mobile_money') {
      const network = typeof b.mobileNetwork === 'string' ? b.mobileNetwork.trim() : '';
      const phone = typeof b.payerPhone === 'string' ? b.payerPhone.trim() : '';
      const momoRef = typeof b.providerReference === 'string' ? b.providerReference.trim() : '';
      const submissionType = typeof b.submissionType === 'string' ? b.submissionType.trim() : 'local_transfer';

      if (!['MTN', 'Vodafone', 'Tigo'].includes(network)) {
        res.status(400).json({ error: 'Select MTN, Vodafone, or Tigo Mobile Money.' });
        return;
      }
      if (!/^[+0-9\s-]{9,18}$/.test(phone)) {
        res.status(400).json({ error: 'Enter a valid Ghana Mobile Money phone number (e.g. 024XXXXXXX or +23324XXXXXXX).' });
        return;
      }

      if (submissionType === 'gateway' && isPaystackConfigured()) {
        const orderRes = db
          .prepare(`
            INSERT INTO payment_orders (
              order_reference, user_id, product_id, quantity, unit_price_usd, total_usd,
              display_currency, display_amount, payment_method, provider_name, mobile_network, payer_phone, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'mobile_money', 'paystack', ?, ?, 'pending', ?)
          `)
          .run(
            orderReference,
            userId,
            product.id,
            quantity,
            unitPriceUsd,
            totalUsd,
            currency,
            displayAmount,
            network as MobileNetwork,
            phone,
            `Paystack ${network} Mobile Money checkout`
          );

        const init = await initializePaystackTransaction({
          email: req.authUser.email,
          amountGhs,
          reference: orderReference,
          callbackUrl: `${baseUrl}/checkout/callback?provider=paystack`,
          channels: ['mobile_money'],
          metadata: { orderId: Number(orderRes.lastInsertRowid), network, phone },
        });

        res.status(201).json({
          mode: 'redirect',
          provider: 'paystack',
          orderReference,
          authorizationUrl: init.authorizationUrl,
        });
        return;
      }

      if (momoRef.length < 4) {
        res.status(400).json({ error: `Enter your ${network} Mobile Money transaction ID or reference.` });
        return;
      }

      const txResult = db.transaction(() => {
        const orderRes = db
          .prepare(`
            INSERT INTO payment_orders (
              order_reference, user_id, product_id, quantity, unit_price_usd, total_usd,
              display_currency, display_amount, payment_method, provider_name, provider_reference,
              mobile_network, payer_phone, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'mobile_money', 'manual_momo', ?, ?, ?, 'pending_verification', ?)
          `)
          .run(
            orderReference,
            userId,
            product.id,
            quantity,
            unitPriceUsd,
            totalUsd,
            currency,
            displayAmount,
            momoRef,
            network,
            phone,
            `${network} Mobile Money transfer awaiting admin confirmation`
          );
        const orderId = Number(orderRes.lastInsertRowid);
        const tickets = issueTicketsForOrder(orderId, userId, product.id, quantity, 'pending');
        db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
          userId,
          `Mobile Money Payment Submitted (${orderReference})`,
          `Your ${network} transfer (${momoRef}) for ${quantity} ticket(s) on ${product.name} is pending verification.`
        );
        return { orderId, tickets };
      })();

      logActivity({
        actorUserId: userId,
        actorEmail: req.authUser.email,
        action: 'ticket_order_momo_submitted',
        targetType: 'payment_order',
        targetId: orderReference,
        details: `${network} (${phone}) Ref: ${momoRef}`,
      });

      res.status(201).json({
        mode: 'pending_verification',
        status: 'pending_verification',
        orderReference,
        tickets: txResult.tickets,
        message: `Your ${network} Mobile Money transfer reference (${momoRef}) has been recorded. Tickets activate once verified by the RENORA team.`,
      });
      return;
    }

    // 3. BANK TRANSFER
    if (paymentMethod === 'bank_transfer') {
      const bankSenderName = typeof b.bankSenderName === 'string' ? b.bankSenderName.trim() : '';
      const bankReference = typeof b.bankReference === 'string' ? b.bankReference.trim() : '';

      if (bankSenderName.length < 2 || bankReference.length < 4) {
        res.status(400).json({ error: 'Enter the sender account name and bank transfer reference.' });
        return;
      }

      const txResult = db.transaction(() => {
        const orderRes = db
          .prepare(`
            INSERT INTO payment_orders (
              order_reference, user_id, product_id, quantity, unit_price_usd, total_usd,
              display_currency, display_amount, payment_method, provider_name, bank_sender_name,
              bank_reference, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bank_transfer', 'manual_bank', ?, ?, 'pending_verification', ?)
          `)
          .run(
            orderReference,
            userId,
            product.id,
            quantity,
            unitPriceUsd,
            totalUsd,
            currency,
            displayAmount,
            bankSenderName,
            bankReference,
            'Bank transfer awaiting settlement confirmation'
          );
        const orderId = Number(orderRes.lastInsertRowid);
        const tickets = issueTicketsForOrder(orderId, userId, product.id, quantity, 'pending');
        db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
          userId,
          `Bank Transfer Submitted (${orderReference})`,
          `Your bank transfer (${bankReference}) for ${quantity} ticket(s) on ${product.name} is queued for verification.`
        );
        return { orderId, tickets };
      })();

      logActivity({
        actorUserId: userId,
        actorEmail: req.authUser.email,
        action: 'ticket_order_bank_submitted',
        targetType: 'payment_order',
        targetId: orderReference,
        details: `${bankSenderName} / ${bankReference}`,
      });

      res.status(201).json({
        mode: 'pending_verification',
        status: 'pending_verification',
        orderReference,
        tickets: txResult.tickets,
        message: 'Your bank transfer details have been submitted. Tickets will activate as soon as settlement is confirmed.',
      });
      return;
    }

    // 4. PAYPAL
    if (paymentMethod === 'paypal') {
      if (isPayPalConfigured()) {
        const ppCurrency: 'USD' | 'GBP' | 'CAD' =
          currency === 'GBP' || currency === 'CAD' ? currency : 'USD';
        const ppAmount = convertFromUsd(totalUsd, ppCurrency);

        const orderRes = db
          .prepare(`
            INSERT INTO payment_orders (
              order_reference, user_id, product_id, quantity, unit_price_usd, total_usd,
              display_currency, display_amount, payment_method, provider_name, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paypal', 'paypal', 'pending', ?)
          `)
          .run(
            orderReference,
            userId,
            product.id,
            quantity,
            unitPriceUsd,
            totalUsd,
            ppCurrency,
            ppAmount,
            'PayPal checkout initiated'
          );

        const ppOrder = await createPayPalOrder({
          amount: ppAmount,
          currency: ppCurrency,
          referenceId: orderReference,
          description: `RENORA Tickets (${quantity}x) - ${product.name}`,
          returnUrl: `${baseUrl}/checkout/callback?provider=paypal&ref=${orderReference}`,
          cancelUrl: `${baseUrl}/product/${product.slug}`,
        });

        db.prepare('UPDATE payment_orders SET provider_reference = ? WHERE id = ?').run(
          ppOrder.paypalOrderId,
          Number(orderRes.lastInsertRowid)
        );

        res.status(201).json({
          mode: 'redirect',
          provider: 'paypal',
          orderReference,
          authorizationUrl: ppOrder.approveUrl,
        });
        return;
      }

      const payerEmail = typeof b.paypalEmail === 'string' ? b.paypalEmail.trim() : req.authUser.email;
      const txResult = db.transaction(() => {
        const orderRes = db
          .prepare(`
            INSERT INTO payment_orders (
              order_reference, user_id, product_id, quantity, unit_price_usd, total_usd,
              display_currency, display_amount, payment_method, provider_name, provider_reference, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paypal', 'sandbox', ?, 'sandbox_paid', ?)
          `)
          .run(
            orderReference,
            userId,
            product.id,
            quantity,
            unitPriceUsd,
            totalUsd,
            currency,
            displayAmount,
            `PP-SANDBOX-${orderReference.slice(-6)}`,
            `PayPal Sandbox test checkout (${payerEmail})`
          );
        const orderId = Number(orderRes.lastInsertRowid);
        const tickets = issueTicketsForOrder(orderId, userId, product.id, quantity, 'sandbox');
        db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
          userId,
          `PayPal Sandbox Tickets Issued (${orderReference})`,
          `${quantity} test ticket(s) issued for ${product.name} via PayPal Sandbox mode.`
        );
        return { orderId, tickets };
      })();

      logActivity({
        actorUserId: userId,
        actorEmail: req.authUser.email,
        action: 'ticket_order_sandbox_paypal',
        targetType: 'payment_order',
        targetId: orderReference,
        details: `${quantity}x ${product.name}`,
      });

      res.status(201).json({
        mode: 'completed',
        status: 'sandbox_paid',
        orderReference,
        tickets: txResult.tickets,
        message: 'PayPal Sandbox checkout recorded and test tickets issued. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env for live PayPal checkout.',
      });
    }
  } catch (err) {
    console.error('Payment checkout error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to process ticket checkout.',
    });
  }
});

app.post('/api/payments/paystack/verify', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    if (!reference) {
      res.status(400).json({ error: 'Payment reference is required.' });
      return;
    }

    const order = db
      .prepare('SELECT * FROM payment_orders WHERE order_reference = ? AND user_id = ?')
      .get(reference, req.authUser!.id) as Record<string, unknown> | undefined;

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.status === 'paid') {
      const existingTickets = db
        .prepare('SELECT ticket_code FROM tickets WHERE order_id = ?')
        .all(order.id) as { ticket_code: string }[];
      res.json({ verified: true, orderReference: reference, tickets: existingTickets.map((t) => t.ticket_code) });
      return;
    }

    const verification = await verifyPaystackTransaction(reference);
    const expectedMinor = Math.round(convertFromUsd(Number(order.total_usd), 'GHS') * 100);

    if (!verification.verified || verification.amountMinor < expectedMinor) {
      db.prepare("UPDATE payment_orders SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(order.id);
      res.status(400).json({ error: 'Paystack payment could not be verified or amount mismatch.' });
      return;
    }

    const tickets = db.transaction(() => {
      db.prepare("UPDATE payment_orders SET status = 'paid', provider_reference = ?, updated_at = datetime('now') WHERE id = ?").run(
        reference,
        order.id
      );
      const issued = issueTicketsForOrder(
        Number(order.id),
        Number(order.user_id),
        Number(order.product_id),
        Number(order.quantity),
        'active'
      );
      db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
        order.user_id,
        `Payment Confirmed (${reference})`,
        `Your payment via Paystack (${verification.channel || 'card'}) succeeded and ${issued.length} ticket(s) are now active.`
      );
      return issued;
    })();

    res.json({ verified: true, orderReference: reference, tickets });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Verification error.' });
  }
});

app.post('/api/payments/paypal/capture', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const paypalOrderId = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const ref = typeof req.body?.ref === 'string' ? req.body.ref.trim() : '';

    if (!paypalOrderId) {
      res.status(400).json({ error: 'PayPal order token is required.' });
      return;
    }

    const order = db
      .prepare('SELECT * FROM payment_orders WHERE (provider_reference = ? OR order_reference = ?) AND user_id = ?')
      .get(paypalOrderId, ref, req.authUser!.id) as Record<string, unknown> | undefined;

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.status === 'paid') {
      const existingTickets = db
        .prepare('SELECT ticket_code FROM tickets WHERE order_id = ?')
        .all(order.id) as { ticket_code: string }[];
      res.json({ verified: true, orderReference: order.order_reference, tickets: existingTickets.map((t) => t.ticket_code) });
      return;
    }

    const capture = await capturePayPalOrder(paypalOrderId);
    if (!capture.captured) {
      db.prepare("UPDATE payment_orders SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(order.id);
      res.status(400).json({ error: 'PayPal payment capture was not completed.' });
      return;
    }

    const tickets = db.transaction(() => {
      db.prepare("UPDATE payment_orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?").run(order.id);
      const issued = issueTicketsForOrder(
        Number(order.id),
        Number(order.user_id),
        Number(order.product_id),
        Number(order.quantity),
        'active'
      );
      db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
        order.user_id,
        `PayPal Payment Confirmed (${String(order.order_reference)})`,
        `Your PayPal payment completed and ${issued.length} ticket(s) are now active.`
      );
      return issued;
    })();

    res.json({ verified: true, orderReference: order.order_reference, tickets });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'PayPal capture error.' });
  }
});

app.get('/api/account/tickets', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.authUser || req.authUser.id === null) {
    res.json({ orders: [], tickets: [] });
    return;
  }

  const orders = db
    .prepare(`
      SELECT o.*, p.name as product_name, p.slug as product_slug
      FROM payment_orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.user_id = ?
      ORDER BY o.id DESC
    `)
    .all(req.authUser.id);

  const tickets = db
    .prepare(`
      SELECT t.*, o.order_reference, o.payment_method, o.mobile_network, p.name as product_name, p.slug as product_slug
      FROM tickets t
      JOIN payment_orders o ON o.id = t.order_id
      JOIN products p ON p.id = t.product_id
      WHERE t.user_id = ?
      ORDER BY t.id DESC
    `)
    .all(req.authUser.id);

  res.json({ orders, tickets });
});

app.get('/api/admin/payments', adminLimiter, requireAdmin, (_req, res) => {
  const orders = db
    .prepare(`
      SELECT o.*, u.first_name, u.last_name, u.email as customer_email, p.name as product_name
      FROM payment_orders o
      JOIN users u ON u.id = o.user_id
      JOIN products p ON p.id = o.product_id
      ORDER BY o.id DESC
      LIMIT 150
    `)
    .all();

  res.json({
    orders,
    settlement: getSettlementSettings(),
    paystackConfigured: isPaystackConfigured(),
    paypalConfigured: isPayPalConfigured(),
  });
});

app.patch('/api/admin/payments/:id', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const action = req.body?.action;

  const order = db.prepare('SELECT * FROM payment_orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  if (action !== 'approve' && action !== 'reject') {
    res.status(400).json({ error: 'Invalid payment verification action.' });
    return;
  }

  db.transaction(() => {
    if (action === 'approve') {
      db.prepare("UPDATE payment_orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?").run(id);
      db.prepare("UPDATE tickets SET status = 'active' WHERE order_id = ?").run(id);
      db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
        order.user_id,
        `Payment Verified (${String(order.order_reference)})`,
        `Your payment has been confirmed and your ticket(s) are now active.`
      );
    } else {
      db.prepare("UPDATE payment_orders SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(id);
      db.prepare("UPDATE tickets SET status = 'cancelled' WHERE order_id = ?").run(id);
      db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
        order.user_id,
        `Payment Could Not Be Verified (${String(order.order_reference)})`,
        `Please check your transfer reference or contact RENORA support.`
      );
    }
  })();

  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: action === 'approve' ? 'payment_order_approved' : 'payment_order_rejected',
    targetType: 'payment_order',
    targetId: String(order.order_reference),
  });

  res.json({ ok: true });
});

app.put('/api/admin/payment-settings', adminLimiter, requireAdmin, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  const allowedKeys = [
    'bank_name',
    'bank_account_name',
    'bank_account_number',
    'bank_swift_code',
    'momo_merchant_name',
    'momo_mtn_number',
    'momo_vodafone_number',
    'momo_tigo_number',
  ];

  const upsert = db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  db.transaction(() => {
    for (const key of allowedKeys) {
      if (typeof b[key] === 'string') {
        upsert.run(key, b[key].trim().slice(0, 160));
      }
    }
  })();

  logActivity({
    actorUserId: req.authUser?.id,
    actorEmail: req.authUser?.email || 'admin@renora.local',
    action: 'payment_settings_updated',
    targetType: 'app_settings',
  });

  res.json({ settlement: getSettlementSettings() });
});

// ============================================================================
// VITE DEV MIDDLEWARE / PRODUCTION STATIC SPA SERVING
// ============================================================================

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RENORA server running at http://localhost:${PORT}`);
  });
}

startServer();
