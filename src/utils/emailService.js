// emailService.js
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import net from 'net';
import { getPool } from '../db/db.js';
import { create } from 'domain';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const withRetry = async (fn, attempts = 2, baseDelay = 500) => {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (i === attempts - 1) throw err;
            await sleep(baseDelay * 2 ** i);
        }
    }
    throw lastErr;
};

const classifySmtpError = (err, host) => {
    const provider = /gmail\.com/i.test(host) ? 'gmail' : 'generic';

    if (err.code === 'EAUTH' || err.responseCode === 535) {
        return { type: 'auth', provider, hint: 'Check EMAIL_USER / EMAIL_PASS / app password / security settings' };
    }

    if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
        return { type: 'network', provider, hint: 'Check host/port, firewall, ISP, or blocked IP' };
    }

    if (err.code === 'ESOCKET') {
        return { type: 'tls', provider, hint: 'Check TLS/SSL settings and certificates' };
    }

    return { type: 'unknown', provider, hint: 'Inspect full SMTP error and server logs' };
};

// Simple audit logger
const logAudit = async ({ userId, event, ipAddress = null }) => {
    if (!userId || !event) return;
    const pool = getPool();
    await pool.query(
        `INSERT INTO audit_logs (user_id, event, ip_address) VALUES ($1, $2, $3)`,
        [userId, event, ipAddress]
    );
};

/**
 * EmailService
 *
 * - Multi-provider ready: providers is an array of { key, host, port, user, pass, from? }
 * - If no providers passed, uses env-based single provider.
 */
class EmailService {
    constructor(options = {}) {
        const appName = options.appName ?? process.env.APP_NAME ?? 'App';
        const appIcon = options.appIcon ?? process.env.APP_ICON ?? '';

        // Providers config
        this.providers = options.providers ?? [
            {
                key: 'primary',
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT),
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
                from: process.env.EMAIL_USER,
            },
        ];

        this.appName = appName;
        this.appIcon = appIcon;

        // Transporters cache: { [key]: nodemailer.Transporter }
        this.transporters = new Map();

        // Health per provider: { [key]: { ok, stage, error?, checkedAt } }
        this.health = {};

        // periodic check config (default OFF, 1h)
        this.periodicEnabled = options.enablePeriodicCheck ?? false;
        this.periodicIntervalMs = options.periodicIntervalMs ?? 60 * 60 * 1000;
        this.periodicSilent = options.periodicSilent ?? true;
        this._periodicTimer = null;

        if (this.periodicEnabled) {
            this.startPeriodicChecks();
        }
    }

    // ---------- Provider helpers ----------

    _getProvider(key = 'primary') {
        return this.providers.find((p) => p.key === key) ?? this.providers[0];
    }

    _getOrCreateTransporter(key = 'primary') {
        if (this.transporters.has(key)) return this.transporters.get(key);

        const provider = this._getProvider(key);
        const transporter = nodemailer.createTransport({
            host: provider.host,
            port: provider.port,
            secure: provider.port === 465,
            auth: {
                user: provider.user,
                pass: provider.pass,
            },
            tls: {
                rejectUnauthorized: true,
            },
        });

        this.transporters.set(key, transporter);
        return transporter;
    }

    getHealth(key = 'primary') {
        return this.health[key] ?? null;
    }

    // ---------- Layered checks (per provider) ----------

    async _dnsCheck(providerKey) {
        const provider = this._getProvider(providerKey);
        await dns.lookup(provider.host);
        this.health[providerKey] = { ok: true, stage: 'dns', checkedAt: new Date() };
    }

    async _portCheck(providerKey, timeoutMs = 5000) {
        const provider = this._getProvider(providerKey);
        const { host, port } = provider;

        await new Promise((resolve, reject) => {
            const socket = net.createConnection(port, host);
            let done = false;

            const finish = (err) => {
                if (done) return;
                done = true;
                socket.destroy();
                err ? reject(err) : resolve(true);
            };

            socket.setTimeout(timeoutMs);

            socket.once('connect', () => finish());
            socket.once('timeout', () => finish(new Error('Port check timeout')));
            socket.once('error', (err) => finish(err));
        });

        this.health[providerKey] = { ok: true, stage: 'port', checkedAt: new Date() };
    }

    async _smtpVerify(providerKey) {
        const transporter = this._getOrCreateTransporter(providerKey);
        const result = await transporter.verify();
        if (result !== true) {
            throw new Error('SMTP verify returned false');
        }
        this.health[providerKey] = { ok: true, stage: 'smtp', checkedAt: new Date() };
    }

    /**
     * preCheck
     * - Layered DNS -> port -> SMTP verify
     * - retries: number of extra attempts
     * - silent: no logs if true
     */
    async preCheck({ providerKey = 'primary', retries = 1, silent = false } = {}) {
        console.log();
        console.log("=> Running EmailService preCheck...");
        const provider = this._getProvider(providerKey);

        const runOnce = async () => {
            try {
                await this._dnsCheck(providerKey);
                await this._portCheck(providerKey);
                await this._smtpVerify(providerKey);

                if (!silent) {
                    console.log(`>> ✅ SMTP preCheck passed for provider "${providerKey}" (${provider.host})`);
                }

                return this.health[providerKey];
            } catch (err) {
                const classified = classifySmtpError(err, provider.host);

                const stage = this.health[providerKey]?.stage ?? 'dns';
                this.health[providerKey] = {
                    ok: false,
                    stage,
                    error: {
                        message: err.message,
                        code: err.code,
                        response: err.response,
                        responseCode: err.responseCode,
                        command: err.command,
                        type: classified.type,
                        provider: classified.provider,
                        hint: classified.hint,
                    },
                    checkedAt: new Date(),
                };

                if (!silent) {
                    console.error('   Message:', err.message);
                    console.error('   Code:', err.code);
                    console.error('   Response:', err.response);
                    console.error('   Response Code:', err.responseCode);
                    console.error('   Command:', err.command);
                    console.error('   Type:', classified.type, 'Provider:', classified.provider);
                    console.error('   Hint:', classified.hint);
                    
                    console.error(`>> ❌ SMTP preCheck failed for provider "${providerKey}" at stage:`, stage);
                }

                throw err;
            }
        };

        if (retries <= 0) {
            return runOnce();
        }
        return withRetry(runOnce, retries + 1);
    }

    // ---------- Periodic check (default OFF) ----------

    startPeriodicChecks({ providerKey = 'primary', intervalMs, silent } = {}) {
        const period = intervalMs ?? this.periodicIntervalMs;
        const quiet = silent ?? this.periodicSilent;

        if (this._periodicTimer) clearInterval(this._periodicTimer);

        this._periodicTimer = setInterval(async () => {
            try {
                await this.preCheck({ providerKey, retries: 0, silent: quiet });
            } catch (err) {
                if (!quiet) {
                    console.error(`⚠️ Periodic SMTP check failed for provider "${providerKey}":`, err.message);
                }
            }
        }, period);
    }

    stopPeriodicChecks() {
        if (this._periodicTimer) {
            clearInterval(this._periodicTimer);
            this._periodicTimer = null;
        }
    }

    // ---------- Template system ----------

    _buildVerificationTemplate({ verificationLink }) {
        const appName = this.appName;
        const appIcon = this.appIcon;

        const subject = `[${appName}] Verify your email`;
        const text = [
            `Hi,`,
            ``,
            `Please verify your email for ${appName}.`,
            ``,
            `Click this link:`,
            verificationLink,
            ``,
            `If the link is not clickable, copy and paste it into your browser.`,
            ``,
            `This link will expire in 24 hours.`,
            ``,
            `— ${appName}`,
        ].join('\n');

        console.log("verficationLink : ", verificationLink);
        const html = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; background:#f9fafb; padding:20px;">
          <table width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr style="background:#111827;color:#ffffff;">
              <td style="padding:16px 20px;display:flex;align-items:center;">
                ${appIcon
                ? `<img src="${appIcon}" alt="${appName} logo" style="height:32px;width:32px;object-fit:contain;margin-right:8px;" />`
                : ''
            }
                <span style="font-size:18px;font-weight:600;">${appName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:20px;">
                <h2 style="color:#111827;margin:0 0 12px;">Verify your email</h2>
                <p>Hi,</p>
                <p>Please click the button below to verify your email address for <strong>${appName}</strong>:</p>
                <p style="margin:20px 0;">
                  <a href="${verificationLink}"
                     style="
                       display:inline-block;
                       padding:10px 18px;
                       background-color:#2563eb;
                       color:#ffffff;
                       text-decoration:none;
                       border-radius:6px;
                       font-weight:600;
                     ">
                    Verify Email
                  </a>
                </p>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break:break-all;">
                  <a href="${verificationLink}" style="color:#2563eb;">${verificationLink}</a>
                </p>
                <p style="margin-top:16px;font-size:13px;color:#6b7280;">
                  This link will expire in 24 hours.
                </p>
                <p style="margin-top:16px;">— ${appName}</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

        return { subject, text, html };
    }

    // ---------- Generic send (immediate) ----------

    async sendMail({ providerKey = 'primary', to, subject, text, html, from, metadata = {} } = {}) {
        const provider = this._getProvider(providerKey);
        const transporter = this._getOrCreateTransporter(providerKey);

        const info = await transporter.sendMail({
            from: from ?? provider.from ?? provider.user,
            to,
            subject,
            text,
            html,
        });

        // Just return metadata + nodemailer info
        return {
            providerKey,
            messageId: info.messageId,
            envelope: info.envelope,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
            metadata,
        };
    }

    // ---------- DB queue support ----------

    /**
     * Enqueue an email in DB queue (no send).
     * Assumes a table like:
     *   email_queue(
     *     id SERIAL PK,
     *     provider_key TEXT,
     *     to_email TEXT,
     *     subject TEXT,
     *     text_body TEXT,
     *     html_body TEXT,
     *     metadata JSONB,
     *     status TEXT,            -- pending/sent/failed
     *     attempts INT,
     *     last_error TEXT,
     *     created_at TIMESTAMPTZ DEFAULT NOW(),
     *     scheduled_at TIMESTAMPTZ,
     *     sent_at TIMESTAMPTZ
     *   )
     */
    async enqueueEmail({ providerKey = 'primary', to, subject, text, html, metadata = {}, scheduledAt = null }) {
        const pool = getPool();
        const result = await pool.query(
            `INSERT INTO email_queue
         (provider_key, to_email, subject, text_body, html_body, metadata, status, attempts, last_error, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0, null, $7)
       RETURNING id`,
            [providerKey, to, subject, text, html, metadata, scheduledAt]
        );

        return { id: result.rows[0].id };
    }

    /**
     * Process pending emails from DB queue.
     * - Limit how many to process in one call.
     */
    async processQueue({ limit = 10 } = {}) {
        const pool = getPool();

        const { rows } = await pool.query(
            `SELECT *
         FROM email_queue
        WHERE status = 'pending'
          AND (scheduled_at IS NULL OR scheduled_at <= NOW())
        ORDER BY created_at ASC
        LIMIT $1`,
            [limit]
        );

        for (const row of rows) {
            const metadata = row.metadata ?? {};
            try {
                const sendResult = await this.sendMail({
                    providerKey: row.provider_key,
                    to: row.to_email,
                    subject: row.subject,
                    text: row.text_body,
                    html: row.html_body,
                    metadata,
                });

                await pool.query(
                    `UPDATE email_queue
              SET status = 'sent',
                  attempts = attempts + 1,
                  last_error = null,
                  sent_at = NOW()
            WHERE id = $1`,
                    [row.id]
                );

                // optional: log per email meta somewhere else if you want
            } catch (err) {
                await pool.query(
                    `UPDATE email_queue
              SET status = 'failed',
                  attempts = attempts + 1,
                  last_error = $2
            WHERE id = $1`,
                    [row.id, err.message?.slice(0, 1000) ?? 'unknown error']
                );
            }
        }
    }

    // ---------- Verification email (immediate + audit log) ----------

    async sendVerificationEmail(userId, email, providerKey = 'primary', { ipAddress = null, resend = false } = {}) {
        const pool = getPool();

        console.log("inputs : ", userId, email, providerKey, ipAddress, resend);

        // Delete old token
        await pool.query(
            `DELETE FROM email_verification_tokens WHERE user_id = $1`,
            [userId]
        );

        // New token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
            `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
            [userId, token, expiresAt]
        );

        const baseUrl = process.env.APP_URL?.replace(/\/+$/, '') ?? '';
        const verificationLink = `${baseUrl}/api/verify-email?token=${token}`;

        const { subject, text, html } = this._buildVerificationTemplate({ verificationLink });

        const sendResult = await this.sendMail({
            providerKey,
            to: email,
            subject,
            text,
            html,
            metadata: {
                type: 'verification',
                userId,
                email,
                token,
                expiresAt,
            },
        });

        // Audit log: VERIFICATION_EMAIL_RESENT when this is a resend
        if (resend) {
            await logAudit({
                userId,
                event: 'VERIFICATION_EMAIL_RESENT',
                ipAddress,
            });
        }

        return { token, expiresAt, sendResult };
    }
}

let emailService = null;

export const createEmailService = (options = {}) => {
    if (!emailService) {
        emailService = new EmailService(options);
    }
    return emailService;
};

export { emailService, EmailService };
