
import express from 'express';
import argon2 from 'argon2';
import { body, validationResult } from 'express-validator';
import { getPool } from '../db/db.js';
import rateLimit from 'express-rate-limit';
import { emailService } from '../utils/emailService.js';

const router = express.Router();

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many registration attempts, please try again later.'
});

router.post('/register',
    registerLimiter,
    [
        body('email').isEmail().withMessage('Invalid email'),
        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
            .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
            .matches(/\d/).withMessage('Password must contain a number')
            .matches(/[@$!%*?&]/).withMessage('Password must contain a special character')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const pool = getPool();

        try {
            await pool.query('BEGIN');

            const existingIdentity = await pool.query(
                `SELECT id FROM user_identities WHERE provider = $1 AND email = $2`,
                ['local', email]
            );
            if (existingIdentity.rows.length > 0) {
                await pool.query('ROLLBACK');
                return res.status(409).json({ error: 'Email already registered' });
            }

            const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

            const userResult = await pool.query(
                `INSERT INTO users (primary_email) VALUES ($1) RETURNING id`,
                [email]
            );
            const userId = userResult.rows[0].id;

            await pool.query(
                `INSERT INTO user_identities (user_id, provider, email, password_hash)
         VALUES ($1, $2, $3, $4)`,
                [userId, 'local', email, passwordHash]
            );

            await pool.query(
                `INSERT INTO audit_logs (user_id, event, ip_address)
         VALUES ($1, $2, $3)`,
                [userId, 'REGISTER_SUCCESS', req.ip]
            );

            // Send verification email using helper
           await emailService.sendVerificationEmail(userId, email, 'primary', {
                userId,
                to: email,
                templateKey: 'verifyEmail',
                variables: { userId },
                providerKey: 'primary',
                ipAddress: req.ip,
                resend: false
            });

            await pool.query(
                `INSERT INTO audit_logs (user_id, event, ip_address)
                VALUES ($1, $2, $3)`,
                [userId, 'VERIFICATION_EMAIL_SENT', req.ip]
            );

            await pool.query('COMMIT');

            return res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.' });
        } catch (err) {
            console.error(err);
            await pool.query('ROLLBACK');
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);

export default router;
