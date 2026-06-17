import express from 'express';
import {
    getServicesByField,
    createService,
    updateService,
    deleteService,
    getOwnerServices,
} from '../controllers/serviceController.js';

const router = express.Router();

router.get('/field/:fieldId', getServicesByField);
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);
router.get('/owner/services/list', getOwnerServices);

export default router;
