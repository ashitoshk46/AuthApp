import express from 'express';
import argon2 from 'argon2';
import { body, validationResult } from 'express-validator';
import {getPool} from '../db/db.js'; // Your pg Pool instance

const router = express.Router();

router.post('/register',
    [
        body('email').isEmail().withMessage('Invalid email'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 chars')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            // Check if user exists
            const existing = await getPool().query('SELECT id FROM users WHERE email = $1', [email]);
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'Email already registered' });
            }

            // Hash password
            const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

            // Insert user
            await getPool().query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, passwordHash]);

            return res.status(201).json({ message: 'User registered successfully' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);

export default router;