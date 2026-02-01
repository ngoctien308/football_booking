import express from 'express';
import { createUser, getCurrentUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', createUser);
router.get('/me/:clerk_user_id', getCurrentUser);

export default router;