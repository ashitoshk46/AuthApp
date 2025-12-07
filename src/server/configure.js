import { initializeDb } from '../db/db.js';

const configure = async () => {
    // Load .env in non-production
    console.log();
    console.log('=> Loading environment variables...');

    
    process.env.NODE_ENV = (process.env.NODE_ENV || "")?.trim();

    if (process.env.NODE_ENV !== 'production') {
        await import('dotenv').then(dotenv => {
            dotenv.config();
        });
        process.env.NODE_ENV =  process.env.NODE_ENV ? process.env.NODE_ENV : "development";
        process.env.APP_URL = `${process.env.HOST}:${process.env.PORT}`;
    } else {
        process.env.APP_URL = process.env.HOST;
    }

    console.log('>> Environment variables loaded');

    initializeDb();
}

export default configure;