
import express from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/db.js';

const router = express.Router();

router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body; // Or use req.cookies.refreshToken if using cookies

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const pool = getPool();

  try {
    // Verify JWT signature
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const userId = payload.userId;

    // Check token in DB
    const sessionRes = await pool.query(
      `SELECT id, expires_at FROM sessions WHERE user_id = $1 AND refresh_token = $2`,
      [userId, refreshToken]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(401).json({ error: 'Session not found or token revoked' });
    }

    const { expires_at } = sessionRes.rows[0];
    if (new Date() > expires_at) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    // Optional: Rotate refresh token for extra security
    const newRefreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    await pool.query(
      `UPDATE sessions SET refresh_token = $1, expires_at = NOW() + interval '7 days' WHERE id = $2`,
      [newRefreshToken, sessionRes.rows[0].id]
    );

    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
