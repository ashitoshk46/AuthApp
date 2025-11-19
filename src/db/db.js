import { Pool } from 'pg';

let pool = null;

const initializeDb = () => {
    if (!pool) {
        console.log();
        console.log('=> Initializing database pool ...');
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            ssl: { rejectUnauthorized: false },
            max: 10, // max connections
            idleTimeoutMillis: 30000 // 30s idle timeout
        });
        console.log('>> Database pool initialized.');
    }
}

const checkDbConnection = async () => {
    try {
        console.log();
        console.log('=> DB Pre-check: Attempting to connect to the database...');
        console.log(process.env.DATABASE_URL);
        await getPool().query('SELECT 1 AS ok');
        console.log('>> DB Pre-check: Database connection successful.');
    } catch (err) {
        console.error('>> DB Pre-check: Database connection error:', err, err.message);
        process.exit(1);
    }
}

const getPool = () => pool;

const validate_db_schema = async () => {

}

export { initializeDb, checkDbConnection, getPool, validate_db_schema };