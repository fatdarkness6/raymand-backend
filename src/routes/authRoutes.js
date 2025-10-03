import express from "express";
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  verify2FA,
  resendVerificationCode,
  resend2FACode,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-code", resendVerificationCode);
router.post("/login", login);
router.post("/verify-2fa", verify2FA);
router.post("/resend-2fa", resend2FACode);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
