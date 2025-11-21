import { getPool } from "../db/db.js";
import registerRoute from '../routes/register.js';



const appRoutes = (app) => {

    // ✅ Health endpoint for app
    app.get('/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));

    // ✅ DB health check endpoint
    app.get('/db-health', async (_req, res) => {
        try {
            const result = await getPool().query('SELECT 1 AS ok');
            res.json({ dbConnected: true, result: result.rows[0].ok });
        } catch (err) {
            console.error('DB connection error:', err, err.message);
            res.status(500).json({ dbConnected: false });
            process.exit(1);
        }
    });

    // Register user api
    app.use('/api', registerRoute);
}


export default appRoutes;