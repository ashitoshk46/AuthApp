import { dbTypes } from './column/dbTypes.js';

export const schemas = {
  users: {
    columns: [
      { name: 'id', type: dbTypes.ID, primary: true },
      { name: 'primary_email', type: dbTypes.STRING, length: 255, unique: true, notNull: true },
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
      { name: 'token', type: dbTypes.TEXT, notNull: true },
      { name: 'expires_at', type: dbTypes.TIMESTAMP, notNull: true },
      { name: 'created_at', type: dbTypes.TIMESTAMP, current: true }
    ]
  },
  audit_logs: {
    columns: [
      { name: 'id', type: dbTypes.ID, primary: true },
      { name: 'user_id', type: dbTypes.REFERENCE, refTable: 'users', refColumn: 'id' },
      { name: 'event', type: dbTypes.STRING, length: 255, notNull: true }, // LOGIN_SUCCESS, MFA_SETUP
      { name: 'ip_address', type: dbTypes.STRING, length: 45 },
      { name: 'created_at', type: dbTypes.TIMESTAMP, current: true }
    ]
  }
};