import { initializeDb } from '../db/db.js';

const configure = async () => {
    // Load .env in non-production
    console.log();
    console.log('=> Loading environment variables...');
    if (process.env.NODE_ENV !== 'production') {
        await import('dotenv').then(dotenv => {
            dotenv.config();
        });
    }
    console.log('>> Environment variables loaded.');

    initializeDb();
}

export default configure;