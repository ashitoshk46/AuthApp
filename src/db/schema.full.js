
import { dbTypes } from './column/dbTypes.js';

export const schemas = {
  users: {
    columns: [
      { name: 'id', type: dbTypes.ID, primary: true },
      { name: 'primary_email', type: dbTypes.STRING, length: 255, unique: true, notNull: true },
      { name: 'is_verified', type: dbTypes.BOOLEAN, default: false }, // NEW: Email verification status
      { name: 'mfa_enabled', type: dbTypes.BOOLEAN, default: false }, // NEW: For future MFA support
      { name: 'created_at', type: dbTypes.TIMESTAMP, current: true },
      { name: 'updated_at', type: dbTypes.TIMESTAMP, current: true }
    ]
  },
  user_identities: {
    columns: [
      { name: 'id', type: dbTypes.ID, primary: true },
      { name: 'user_id', type: dbTypes.REFERENCE, refTable: 'users', refColumn: 'id', onDelete: 'CASCADE' },
      { name: 'provider', type: dbTypes.STRING, length: 50, notNull: true }, // local, google, github
      { name: 'email', type: dbTypes.STRING, length: 255, notNull: true },
      { name: 'password_hash', type: dbTypes.TEXT, nullable: true }, // only for local
      { name: 'created_at', type: dbTypes.TIMESTAMP, current: true }
    ],
    uniqueConstraints: ['provider', 'email']
  },
  sessions: {
    columns: [
      { name: 'id', type: dbTypes.ID, primary: true },
      { name: 'user_id', type: dbTypes.REFERENCE, refTable: 'users', refColumn: 'id', onDelete: 'CASCADE' },
      { name: 'refresh_token', type: dbTypes.TEXT, notNull: true },
      { name: 'expires_at', type: dbTypes.TIMESTAMP, notNull: true },
      { name: 'created_at', type: dbTypes.TIMESTAMP, current: true }
    ]
  },
  email_verification_tokens: {
    columns: [
      { name: 'id', type: dbTypes.ID, primary: true },
      { name: 'user_id', type: dbTypes.REFERENCE, refTable: 'users', refColumn: 'id', onDelete: 'CASCADE' },
      { name: 'token', type: dbTypes.TEXT, notNull: true }, // long random string for clickable link
      { name: 'expires_at', type: dbTypes.TIMESTAMP, notNull: true },
      { name: 'created_at', type: dbTypes.TIMESTAMP, current: true }
    ]
  },
  verification_attempts: {
    columns: [
      { name: 'id', type: dbTypes.ID, primary: true },
      { name: 'user_id', type: dbTypes.REFERENCE, refTable: 'users', refColumn: 'id', onDelete: 'CASCADE' },
      { name: 'verification_tries', type: dbTypes.INTEGER, default: 3 }, // starts at 3
      { name: 'next_verification_date', type: dbTypes.TIMESTAMP, nullable: true }, // cooldown reset
      { name: 'created_at', type: dbTypes.TIMESTAMP, current: true },
      { name: 'updated_at', type: dbTypes.TIMESTAMP, current: true }
    ]
  },
  audit_logs: {
    columns: [
      { name: 'id', type: dbTypes.ID, primary: true },
      { name: 'user_id', type: dbTypes.REFERENCE, refTable: 'users', refColumn: 'id', onDelete: 'CASCADE' },
      { name: 'event', type: dbTypes.STRING, length: 255, notNull: true }, // REGISTER_SUCCESS, LOGIN_SUCCESS
      { name: 'ip_address', type: dbTypes.STRING, length: 45 },
      { name: 'created_at', type: dbTypes.TIMESTAMP, current: true }
    ]
  }
}