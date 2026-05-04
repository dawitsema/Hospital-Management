import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import { User } from "../models/User.js";
import { config } from "../config.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "7d" });
}

function userPayload(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    specialty: user.specialty || "",
    phone: user.phone || "",
  };
}

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const { email, password, name } = parsed.data;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name,
    role: "patient",
  });
  const token = signToken(user._id.toString());
  return res.status(201).json({ token, user: userPayload(user) });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (user.isActive === false) {
    return res.status(401).json({ error: "This account has been deactivated" });
  }
  const token = signToken(user._id.toString());
  return res.json({ token, user: userPayload(user) });
});

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const emailLower = parsed.data.email.toLowerCase();
  const user = await User.findOne({ email: emailLower });
  const generic = { message: "If an account exists for that email, password reset instructions have been recorded." };
  if (!user || user.isActive === false) {
    return res.json(generic);
  }
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  if (config.returnResetTokenInResponse) {
    return res.json({
      ...generic,
      resetToken: rawToken,
      resetUrlHint: "Open /reset-password in the app and paste the token, or use ?token= in the reset page URL.",
    });
  }
  return res.json(generic);
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const { token, newPassword } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();
  return res.json({ message: "Password updated. You can sign in with your new password." });
});

export default router;
