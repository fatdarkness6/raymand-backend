import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs"; // for password hashing

// ==================================================
// 💌 Unified Raymand Email Template System
// ==================================================
const buildEmailTemplate = (
  title,
  message,
  actionText,
  footerText,
  type = "info"
) => {
  const colorMap = {
    success: "#22c55e",
    warning: "#facc15",
    error: "#ef4444",
    info: "#3b82f6",
  };

  const gradientMap = {
    success: "linear-gradient(135deg, #22c55e, #16a34a)",
    warning: "linear-gradient(135deg, #facc15, #eab308)",
    error: "linear-gradient(135deg, #ef4444, #dc2626)",
    info: "linear-gradient(135deg, #3b82f6, #06b6d4)",
  };

  const themeColor = colorMap[type] || colorMap.info;
  const gradient = gradientMap[type] || gradientMap.info;

  return `
  <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #f6f9fc; padding: 40px; text-align: center; color: #333;">
    <div style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 6px 20px rgba(0,0,0,0.08); max-width: 600px; margin: auto; overflow: hidden;">
      <div style="background: ${gradient}; padding: 30px 20px; color: #fff;">
        <img src="https://i.ibb.co/zV9bH1D/raymand-logo.png" alt="Raymand Lab" style="width: 90px; margin-bottom: 10px;">
        <h1 style="font-size: 24px; margin: 0; font-weight: 600;">${title}</h1>
        <p style="font-size: 14px; opacity: 0.9;">Raymand Lab – Security & Authentication</p>
      </div>

      <div style="padding: 30px 20px;">
        <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>
        ${
          actionText
            ? `<div style="display:inline-block;background-color:${themeColor};color:white;padding:12px 25px;border-radius:8px;font-size:16px;font-weight:500;">
              ${actionText}
            </div>`
            : ""
        }
        <p style="margin-top:25px;font-size:14px;color:#555;">${
          footerText || ""
        }</p>
      </div>

      <div style="background-color:#f1f5f9;padding:15px;font-size:12px;color:#777;">
        <p style="margin:0;">This is an automated email from Raymand Lab. Do not reply.</p>
        <p style="margin:5px 0 0;">© 2025 Raymand Lab – All rights reserved.</p>
      </div>
    </div>
  </div>`;
};

const sendMail = async (
  to,
  subject,
  title,
  message,
  actionText = "",
  footerText = "",
  type = "info"
) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const html = buildEmailTemplate(title, message, actionText, footerText, type);

  await transporter.sendMail({
    from: `"Raymand Lab" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

// ==================================================
// 🧠 AUTH CONTROLLERS
// ==================================================

// REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    const verificationCode = crypto.randomBytes(5).toString("hex");
    const verificationCodeExp = Date.now() + 15 * 60 * 1000;

    user = await User.create({
      name,
      email,
      password,
      verificationCode,
      verificationCodeExp,
    });

    await sendMail(
      email,
      "Verify Your Email ✉️",
      "Welcome to Raymand Lab 🎉",
      `Hi ${
        name || "there"
      }! Use the verification code below to confirm your email.`,
      `Verification Code: <strong>${verificationCode}</strong>`,
      "This code expires in 15 minutes.",
      "info"
    );

    res.status(201).json({ msg: "User registered. Please verify your email." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// RESEND VERIFICATION
export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ msg: "Already verified" });

    const cooldown = 60 * 1000;
    if (user.lastResendAt && Date.now() - user.lastResendAt < cooldown) {
      const remaining = Math.ceil(
        (cooldown - (Date.now() - user.lastResendAt)) / 1000
      );
      return res
        .status(429)
        .json({ msg: `Please wait ${remaining}s before resending.` });
    }

    const code = crypto.randomBytes(5).toString("hex");
    user.verificationCode = code;
    user.verificationCodeExp = Date.now() + 15 * 60 * 1000;
    user.lastResendAt = new Date();
    await user.save();

    await sendMail(
      user.email,
      "Resend Verification Code ✉️",
      "Verification Code Resent 🔁",
      "Use the code below to verify your email.",
      `Verification Code: <strong>${code}</strong>`,
      "This code will expire in 15 minutes.",
      "info"
    );

    res.json({ msg: "New verification code sent." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ msg: "Already verified" });
    if (user.verificationCode !== code)
      return res.status(400).json({ msg: "Invalid code" });
    if (user.verificationCodeExp < Date.now())
      return res.status(400).json({ msg: "Code expired. Request new one." });

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExp = undefined;
    await user.save();

    await sendMail(
      email,
      "Email Verified ✅",
      "Email Verification Successful 🎉",
      `Your email <b>${email}</b> is now verified.`,
      "",
      "Welcome to Raymand Lab Security System.",
      "success"
    );

    res.json({ msg: "Email verified successfully." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// LOGIN (Send 2FA)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
    if (!user.isVerified)
      return res.status(401).json({ msg: "Email not verified" });

    const now = Date.now();
    if (user.twoFACode && user.twoFACodeExp > now)
      return res
        .status(429)
        .json({ msg: "2FA code already sent. Try again later." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFACode = code;
    user.twoFACodeExp = now + 5 * 60 * 1000;
    await user.save();

    await sendMail(
      email,
      "Your 2FA Login Code 🔒",
      "Secure Login Code 🔐",
      `Here’s your 2FA code for login:`,
      `<strong>${code}</strong>`,
      "This code expires in 5 minutes.",
      "info"
    );

    res.json({ msg: "2FA code sent to your email." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// VERIFY 2FA
export const verify2FA = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    if (user.twoFACode !== code)
      return res.status(400).json({ msg: "Invalid code" });
    if (user.twoFACodeExp < Date.now())
      return res.status(400).json({ msg: "Code expired" });

    user.twoFACode = undefined;
    user.twoFACodeExp = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ msg: "Login successful", token });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// RESEND 2FA CODE
export const resend2FACode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const now = Date.now();
    if (user.last2FAResendAt && now - user.last2FAResendAt < 60 * 1000) {
      const remaining = 60 - Math.floor((now - user.last2FAResendAt) / 1000);
      return res
        .status(429)
        .json({ msg: `Wait ${remaining}s before resending.` });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFACode = code;
    user.twoFACodeExp = now + 5 * 60 * 1000;
    user.last2FAResendAt = now;
    await user.save();

    await sendMail(
      email,
      "New 2FA Login Code 🔐",
      "Your New Login Code",
      "Use this updated 2FA code to continue:",
      `<strong>${code}</strong>`,
      "This code expires in 5 minutes.",
      "info"
    );

    res.json({ msg: "New 2FA code sent." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExp = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `https://test-raymand.vercel.app/reset-password?token=${resetToken}&email=${email}`;

    await sendMail(
      email,
      "Reset Your Password 🔑",
      "Password Reset Request",
      "Click below to reset your password.",
      `<a href="${resetLink}" style="color:white;text-decoration:none;">Reset Password</a>`,
      "This link will expire in 15 minutes.",
      "warning"
    );

    res.json({ msg: "Password reset link sent." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.resetPasswordToken !== token)
      return res.status(400).json({ msg: "Invalid token" });
    if (user.resetPasswordExp < Date.now())
      return res.status(400).json({ msg: "Token expired" });

    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));
    user.resetHistory = user.resetHistory || [];
    const todayResets = user.resetHistory.filter((d) => d >= start && d <= end);
    if (todayResets.length >= 2)
      return res.status(429).json({ msg: "Reset limit: 2 per day" });

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword)
      return res.status(400).json({ msg: "New password can’t match old one" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExp = undefined;
    user.resetHistory.push(new Date());
    await user.save();

    await sendMail(
      email,
      "Password Reset Successful ✅",
      "Password Updated 🎉",
      `Hello ${user.name || "User"}, your password was successfully changed.`,
      "",
      "If this wasn’t you, contact support immediately.",
      "success"
    );

    res.json({ msg: "Password reset successful ✅" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// GET PROFILE
export const getProfile = async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      isVerified: req.user.isVerified,
      createdAt: req.user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
