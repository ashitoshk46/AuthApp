import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

const generateApp = () => {
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
    return app;
}


export default generateApp;