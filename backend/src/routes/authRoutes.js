import express from 'express';
import { db } from '../config/db.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
    try {
        await db.query(
            'INSERT INTO users (clerk_user_id, name, email, role) VALUES (?, ?, ?, ?)',
            [req.body.clerk_user_id, req.body.name, req.body.email, req.body.role]
        );

        res.status(201).json({ message: 'User signed up successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;