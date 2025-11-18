import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

if (process.env.NODE_ENV !== 'production') {
  const { config } = await import('dotenv'); config();
}

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'], credentials: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV, extra: "Feature tes" }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));