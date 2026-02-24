import express from 'express';
import { getAllFields, getFieldsByOwner, createField, getFieldDetail, updateField, deleteField } from '../controllers/fieldController.js';
import { uploadImages } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getAllFields);
router.get('/owner/:clerk_user_id', getFieldsByOwner);
router.get('/:id', getFieldDetail);
router.post(
  '/',
  (req, res, next) => {
    uploadImages(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Lỗi upload ảnh.' });
      }
      next();
    });
  },
  createField
);

router.put(
  '/:id',
  (req, res, next) => {
    uploadImages(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Lỗi upload ảnh.' });
      }
      next();
    });
  },
  updateField
);
router.delete('/:id', deleteField);

export default router;