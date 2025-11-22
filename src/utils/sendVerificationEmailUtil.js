
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getPool } from '../db/db.js';

let transporter = null;

export const getTransporter = () => {
  if (!transporter)
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  return transporter
}

export async function sendVerificationEmail(userId, email) {
  const pool = getPool();

  // Delete old token
  await pool.query(`DELETE FROM email_verification_tokens WHERE user_id = $1`, [userId]);

  // Create new token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );

  // Prepare HTML template
  const verificationLink = `${process.env.APP_URL}/api/verify-email?token=${token}`;
  const htmlTemplate = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Verify Your Email</h2>
        <p>Please click the button below to verify your email:</p>
        ${verificationLink}Verify Email</a>
        <p>If the button doesn't work, copy and paste this link:</p>
        <p>${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
      </body>
    </html>
  `;

  // Send email
  await getTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your email',
    html: htmlTemplate
  });

  return { token, expiresAt };
}
