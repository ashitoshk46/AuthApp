import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import pkg from 'pg';

const { Pool } = pkg;

// Load .env in non-production
if (process.env.NODE_ENV !== 'production') {
  const { config } = await import('dotenv');
  config();
}

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ✅ PostgreSQL Pool
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }
//   // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // max connections
  idleTimeoutMillis: 30000 // 30s idle timeout
});

// ✅ Health endpoint for app
app.get('/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));

// ✅ DB health check endpoint
app.get('/db-health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT 1 AS ok');
    res.json({ dbConnected: true, result: result.rows[0].ok });
  } catch (err) {
    console.error('DB connection error:', err, err.message);
    res.status(500).json({ dbConnected: false });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));