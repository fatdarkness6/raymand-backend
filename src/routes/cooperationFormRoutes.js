import express from 'express';
import { handleEducationForm, handleResearchForm } from '../controllers/cooperationController.js';

const router = express.Router();

router.post('/education', handleEducationForm);
router.post('/research', handleResearchForm);

export default router;