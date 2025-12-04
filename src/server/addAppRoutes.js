import { getPool } from "../db/db.js";
import registerRoute from '../routes/register.js';
import loginRoute from '../routes/login.js'
import sendVerificationEmailRouter from '../routes/sendVerificationEmail.js';
import verifyEmailRouter from "../routes/verifyEmail.js"
import emailVerifiedRouter from "../routes/emailVerified.js"
import refeshToken from "../routes/refreshToken.js"
import logoutRoute from "../routes/logout.js"




const addAppRoutes = (app) => {

    // ✅ Health endpoint for app
    app.get('/', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));
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
    app.use('/api', sendVerificationEmailRouter);
    app.use('/api', verifyEmailRouter);
    app.use('/api', emailVerifiedRouter);
    app.use('/api', loginRoute);
    app.use('/api', logoutRoute);
    app.use('/api', refeshToken);
    

}


export default addAppRoutes;