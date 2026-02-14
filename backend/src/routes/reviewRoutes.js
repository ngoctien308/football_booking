import express from 'express';
import { createReview, updateReview, deleteReview } from '../controllers/reviewController.js';

const router = express.Router();

// Tạo mới đánh giá cho sân
router.post('/', createReview);
// Sửa đánh giá
router.put('/:id', updateReview);
// Xóa đánh giá
router.delete('/:id', deleteReview);

export default router;

