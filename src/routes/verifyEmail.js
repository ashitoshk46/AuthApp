
import express from 'express';
import { getPool } from '../db/db.js';

const router = express.Router();

router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  const pool = getPool();
  console.log("0")

  try {
    await pool.query('BEGIN');
    console.log("1")

    // Find token
    const tokenResult = await pool.query(
      `SELECT user_id, expires_at FROM email_verification_tokens WHERE token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    console.log("2")
    const { user_id, expires_at } = tokenResult.rows[0];

    // Check expiry
    if (new Date() > expires_at) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Mark user as verified
    await pool.query(
      `UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1`,
      [user_id]
    );

    console.log("3")
    // Delete token
    await pool.query(
      `DELETE FROM email_verification_tokens WHERE token = $1`,
      [token]
    );

    // Log verification event
    await pool.query(
      `INSERT INTO audit_logs (user_id, event, ip_address)
      VALUES ($1, $2, $3)`,
      [user_id, 'EMAIL_VERIFIED', req.ip]
    );

    console.log("4")
    await pool.query('COMMIT');

    // Redirect or JSON response
    return res.redirect(`${process.env.APP_URL}/api/email-verified`);
    // Or: return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    console.log("-1")
    await pool.query('ROLLBACK');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
