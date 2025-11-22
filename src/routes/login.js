
import express from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getPool } from '../db/db.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts, please try again later.'
});

router.post('/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const pool = getPool();

    try {
      // Fetch user and identity
      const userRes = await pool.query(
        `SELECT u.id AS user_id, u.is_verified, ui.password_hash
         FROM users u
         JOIN user_identities ui ON ui.user_id = u.id
         WHERE ui.email = $1 AND ui.provider = $2`,
        [email, 'local']
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const { user_id, is_verified, password_hash } = userRes.rows[0];

      // Check email verification
      if (!is_verified) {
        return res.status(403).json({ error: 'Email not verified. Please verify before logging in.' });
      }

      // Verify password
      const valid = await argon2.verify(password_hash, password);
      if (!valid) {
        await pool.query(
          `INSERT INTO audit_logs (user_id, event, ip_address)
           VALUES ($1, $2, $3)`,
          [user_id, 'LOGIN_FAILED', req.ip]
        );
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Invalidate previous sessions
      await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [user_id]);

      // Generate new tokens
      const accessToken = jwt.sign({ userId: user_id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user_id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      // Store new session
      await pool.query(
        `INSERT INTO sessions (user_id, refresh_token, expires_at)
         VALUES ($1, $2, NOW() + interval '7 days')`,
        [user_id, refreshToken]
      );

      // Log successful login
      await pool.query(
        `INSERT INTO audit_logs (user_id, event, ip_address)
         VALUES ($1, $2, $3)`,
        [user_id, 'LOGIN_SUCCESS', req.ip]
      );

      return res.json({ accessToken, refreshToken });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

export default router;
