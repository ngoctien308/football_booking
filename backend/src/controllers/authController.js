import { db } from '../config/db.js';

export const createUser = async (req, res) => {
    try {
        const { clerk_user_id, name, email, role } = req.body;
        if (!clerk_user_id || !role) {
            return res.status(400).json({ message: 'Thiếu clerk_user_id hoặc role.' });
        }
        if (!['customer', 'owner'].includes(role)) {
            return res.status(400).json({ message: 'Vai trò phải là customer hoặc owner.' });
        }

        const [existing] = await db.query('SELECT id, role FROM users WHERE clerk_user_id = ?', [clerk_user_id]);
        if (existing.length > 0) {
            return res.status(200).json({ message: 'Tài khoản đã tồn tại.', currentUser: existing[0] });
        }

        await db.query(
            'INSERT INTO users (clerk_user_id, name, email, role) VALUES (?, ?, ?, ?)',
            [clerk_user_id, name || null, email || null, role]
        );
        const [rows] = await db.query('SELECT * FROM users WHERE clerk_user_id = ?', [clerk_user_id]);
        res.status(201).json({ message: 'Đăng ký thành công.', currentUser: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE clerk_user_id = ?',
            [req.params.clerk_user_id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ currentUser: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }   
}