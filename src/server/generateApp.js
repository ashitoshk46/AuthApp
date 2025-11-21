import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import generaicError from '../Errors/generaicError.js';
import applySecurityHeaders from './applySecurityHeaders.js';


const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });


const generateApp = () => {
    const app = express();
    app.disable('x-powered-by');
    applySecurityHeaders(app);
    app.use(limiter);
    app.use(compression());
    app.use(express.json({ limit: '10kb' }));
    app.use(cookieParser());
    const allowedOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:3000'];
    app.use(cors({ origin: allowedOrigins, credentials: true }));

    if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
    else app.use(morgan('combined'));
    generaicError(app);
    return app;
}


export default generateApp;