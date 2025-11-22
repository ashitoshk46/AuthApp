
import express from 'express';
import { getPool } from '../db/db.js';

const router = express.Router();

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body; // Or from HttpOnly cookie

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const pool = getPool();

  try {
    // Delete session from DB
    const result = await pool.query(
      `DELETE FROM sessions WHERE refresh_token = $1`,
      [refreshToken]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or already logged out' });
    }

    // Optional: Log logout event
    // If you want user_id, fetch before delete
    // await pool.query(`INSERT INTO audit_logs (user_id, event, ip_address) VALUES ($1, 'LOGOUT', $2)`, [userId, req.ip]);

    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
