import { initializeDb } from '../db/db.js';

const configure = async () => {
    // Load .env in non-production
    console.log();
    console.log('=> Loading environment variables...');
    console.log(`--${process.env.NODE_ENV}--`);
    if (process.env.NODE_ENV !== 'production') {
        await import('dotenv').then(dotenv => {
            dotenv.config();
        });
    }
    console.log(`---${process.env.NODE_ENV}---`);
    console.log('>> Environment variables loaded.');

    initializeDb();
}

export default configure;