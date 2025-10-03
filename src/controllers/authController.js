import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

// ================== SEND EMAIL HELPER ==================
const sendMail = async (to, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `"Raymand Lab" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlContent, // send HTML instead of plain text
  });
};

// ================== REGISTER ==================
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user)
      return res
        .status(400)
        .json({ msg: "User already exists", isVerified: user.isVerified });

    const verificationCode = crypto.randomBytes(5).toString("hex");
    user = await User.create({ name, email, password, verificationCode });

    // Beautiful verification email
    await sendMail(
      email,
      "Verify Your Email",
      `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px;">
        <h2 style="color: #4CAF50;">Welcome to Raymand Lab!</h2>
        <p>Hi there 👋</p>
        <p>Thank you for registering. Please verify your email address using the code below:</p>
        <h1 style="color: #FF5722;">${verificationCode}</h1>
        <p style="font-size: 14px; color: #555;">This code expires in 15 minutes.</p>
        <hr style="margin: 20px 0;" />
        <p>Raymand Lab Team</p>
      </div>
      `
    );

    res.status(201).json({ msg: "User registered. Please verify your email." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== RESEND VERIFICATION CODE ==================
export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.isVerified) {
      return res.status(400).json({ msg: "Email is already verified" });
    }

    // === Cooldown check (60 seconds) ===
    const cooldownSeconds = 60;
    if (
      user.lastResendAt &&
      Date.now() - user.lastResendAt.getTime() < cooldownSeconds * 1000
    ) {
      const remaining =
        cooldownSeconds -
        Math.floor((Date.now() - user.lastResendAt.getTime()) / 1000);
      return res.status(429).json({
        msg: `Please wait ${remaining}s before requesting a new code.`,
        remaining,
      });
    }

    // Generate new code
    const verificationCode = crypto.randomBytes(5).toString("hex");
    user.verificationCode = verificationCode;
    user.verificationCodeExp = Date.now() + 15 * 60 * 1000; // 15 minutes
    user.lastResendAt = new Date(); // save last resend time
    await user.save();

    // Send new email
    await sendMail(
      user.email,
      "Resend: Verify Your Email ✉️",
      `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px;">
        <h2 style="color: #4CAF50;">Verification Code Resent</h2>
        <p>Hi 👋</p>
        <p>You requested a new verification code. Use the code below to verify your email:</p>
        <h1 style="color: #FF5722;">${verificationCode}</h1>
        <p style="font-size: 14px; color: #555;">This code will expire in 15 minutes.</p>
        <hr style="margin: 20px 0;" />
        <p>Raymand Lab Team</p>
      </div>
      `
    );

    res.json({ msg: "New verification code sent to email." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== LOGIN STEP 1 (SEND 2FA CODE) ==================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(401).json({ msg: "Email not verified" });
    }

    // generate 6-digit 2FA code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFACode = code;
    user.twoFACodeExp = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    // Beautiful 2FA email
    await sendMail(
      user.email,
      "Your 2FA Login Code 🔒",
      `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px;">
        <h2 style="color: #2196F3;">Two-Factor Authentication</h2>
        <p>Hi, here is your login code:</p>
        <h1 style="color: #FF5722;">${code}</h1>
        <p style="font-size: 14px; color: #555;">This code will expire in 5 minutes.</p>
        <hr style="margin: 20px 0;" />
        <p>Raymand Lab Team</p>
      </div>
      `
    );

    res.json({
      msg: "2FA code sent to your email. Please verify to continue.",
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== RESEND 2FA CODE ==================
export const resend2FACode = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.isVerified) {
      return res.status(400).json({ msg: "Email not verified yet" });
    }

    // === Cooldown check (60 seconds) ===
    const cooldownSeconds = 60;
    if (
      user.lastResendAt &&
      Date.now() - user.lastResendAt.getTime() < cooldownSeconds * 1000
    ) {
      const remaining =
        cooldownSeconds -
        Math.floor((Date.now() - user.lastResendAt.getTime()) / 1000);
      return res.status(429).json({
        msg: `Please wait ${remaining}s before requesting a new 2FA code.`,
        remaining,
      });
    }

    // Generate new 2FA code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFACode = code;
    user.twoFACodeExp = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.lastResendAt = new Date(); // reuse same field
    await user.save();

    // Send new email
    await sendMail(
      user.email,
      "Resend: Your 2FA Login Code 🔒",
      `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px;">
        <h2 style="color: #2196F3;">New 2FA Code Sent</h2>
        <p>Hi 👋</p>
        <p>You requested a new 2FA login code. Use the code below to continue:</p>
        <h1 style="color: #FF5722;">${code}</h1>
        <p style="font-size: 14px; color: #555;">This code will expire in 5 minutes.</p>
        <hr style="margin: 20px 0;" />
        <p>Raymand Lab Team</p>
      </div>
      `
    );

    res.json({ msg: "New 2FA code sent to email." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== LOGIN STEP 2 (VERIFY 2FA) ==================
export const verify2FA = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    if (user.twoFACode !== code || user.twoFACodeExp < Date.now()) {
      return res.status(400).json({ msg: "Invalid or expired 2FA code" });
    }

    // clear code after successful login
    user.twoFACode = undefined;
    user.twoFACodeExp = undefined;
    await user.save();

    // issue JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ msg: "Login successful", token });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== VERIFY EMAIL ==================
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email, verificationCode: code });
    if (!user) return res.status(400).json({ msg: "Invalid code" });

    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();

    // Beautiful confirmation email
    await sendMail(
      user.email,
      "Email Verified Successfully ✅",
      `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px;">
        <h2 style="color: #4CAF50;">Congratulations!</h2>
        <p>Your email <strong>${user.email}</strong> has been verified successfully.</p>
        <p>You can now login and access all features securely.</p>
        <hr style="margin: 20px 0;" />
        <p style="font-size: 14px; color: #555;">Raymand Lab Team</p>
      </div>
      `
    );

    res.json({ msg: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== FORGOT PASSWORD ==================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExp = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Beautiful reset password email
    await sendMail(
      email,
      "Reset Your Password 🔑",
      `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px;">
        <h2 style="color: #F44336;">Password Reset Request</h2>
        <p>Hi, we received a request to reset your password.</p>
        <p>Your reset token is:</p>
        <h1 style="color: #FF5722;">${resetToken}</h1>
        <p style="font-size: 14px; color: #555;">This token will expire in 15 minutes.</p>
        <hr style="margin: 20px 0;" />
        <p>Raymand Lab Team</p>
      </div>
      `
    );

    res.json({ msg: "Reset token sent to email" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== RESET PASSWORD ==================
export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const user = await User.findOne({
      email,
      resetToken: token,
      resetTokenExp: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ msg: "Invalid or expired token" });

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExp = undefined;
    await user.save();

    res.json({ msg: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== GET PROFILE ==================
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
