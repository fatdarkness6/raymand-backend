import express from 'express';
import { register, login, verifyEmail, forgotPassword, resetPassword , verify2FA , resendVerificationCode  } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post("/resend-code", resendVerificationCode);
router.post('/verify-2fa', verify2FA);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
