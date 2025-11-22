
import express from 'express';
import rateLimit from 'express-rate-limit';
import { getPool } from '../db/db.js';
import { sendVerificationEmail } from '../utils/sendVerificationEmailUtil.js';

const router = express.Router();

// IP-based rate limiter
const resendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // max 10 requests per IP per hour
    message: 'Too many requests from this IP, please try later.'
});

router.post('/sendVerification', resendLimiter, async (req, res) => {
    const { userId } = req.body; // or derive from session/JWT
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const pool = getPool();

    try {
        await pool.query('BEGIN');

        // Lock user row for concurrency safety
        const userResult = await pool.query(
            `SELECT id, primary_email, is_verified FROM users WHERE id = $1 FOR UPDATE`,
            [userId]
        );
        if (userResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        const { primary_email, is_verified } = userResult.rows[0];
        if (is_verified) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ error: 'Email already verified' });
        }

        // Check verification attempts
        const attemptResult = await pool.query(
            `SELECT id, verification_tries, next_verification_date FROM verification_attempts WHERE user_id = $1 FOR UPDATE`,
            [userId]
        );

        let verificationTries = 3;
        let nextVerificationDate = null;

        if (attemptResult.rows.length > 0) {
            const attempt = attemptResult.rows[0];
            verificationTries = attempt.verification_tries;
            nextVerificationDate = attempt.next_verification_date;

            if (verificationTries === 0) {
                if (nextVerificationDate && new Date() < nextVerificationDate) {
                    await pool.query('ROLLBACK');
                    return res.status(429).json({ error: `Try again after ${nextVerificationDate}` });
                }
                // Cooldown expired → reset tries
                verificationTries = 2; // one attempt used now
                nextVerificationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                await pool.query(
                    `UPDATE verification_attempts SET verification_tries = $1, next_verification_date = $2, updated_at = NOW() WHERE id = $3`,
                    [verificationTries, nextVerificationDate, attempt.id]
                );
            } else {
                verificationTries -= 1;
                await pool.query(
                    `UPDATE verification_attempts SET verification_tries = $1, updated_at = NOW() WHERE id = $2`,
                    [verificationTries, attempt.id]
                );
            }
        } else {
            // First attempt
            verificationTries = 2;
            nextVerificationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await pool.query(
                `INSERT INTO verification_attempts (user_id, verification_tries, next_verification_date) VALUES ($1, $2, $3)`,
                [userId, verificationTries, nextVerificationDate]
            );
        }

        // Send verification email using helper
        await sendVerificationEmail(userId, primary_email);

        await pool.query(
            `INSERT INTO audit_logs (user_id, event, ip_address)
            VALUES ($1, $2, $3)`,
            [userId, 'VERIFICATION_EMAIL_RESENT', req.ip]
        );


        await pool.query('COMMIT');
        return res.status(200).json({
            message: 'Verification email sent successfully',
            remainingTries: verificationTries
        });
    } catch (err) {
        console.error(err);
        await pool.query('ROLLBACK');
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
