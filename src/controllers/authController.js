import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// ================== SEND EMAIL HELPER ==================
const sendMail = async (to, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
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
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const verificationCode = crypto.randomBytes(20).toString('hex');
    user = await User.create({ email, password, verificationCode });

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

    res.status(201).json({ msg: 'User registered. Please verify your email.' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== LOGIN STEP 1 (SEND 2FA CODE) ==================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    if (!user.isVerified) {
      return res.status(401).json({ msg: 'Email not verified' });
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

    res.json({ msg: '2FA code sent to your email. Please verify to continue.' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== LOGIN STEP 2 (VERIFY 2FA) ==================
export const verify2FA = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });

    if (user.twoFACode !== code || user.twoFACodeExp < Date.now()) {
      return res.status(400).json({ msg: 'Invalid or expired 2FA code' });
    }

    // clear code after successful login
    user.twoFACode = undefined;
    user.twoFACodeExp = undefined;
    await user.save();

    // issue JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ msg: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== VERIFY EMAIL ==================
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email, verificationCode: code });
    if (!user) return res.status(400).json({ msg: 'Invalid code' });

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

    res.json({ msg: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ================== FORGOT PASSWORD ==================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });

    const resetToken = crypto.randomBytes(20).toString('hex');
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

    res.json({ msg: 'Reset token sent to email' });
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
      resetTokenExp: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExp = undefined;
    await user.save();

    res.json({ msg: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
