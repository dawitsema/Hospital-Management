import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "./config.js";
import { authRequired } from "./middleware/auth.js";
import { requireRole } from "./middleware/requireRole.js";
import { User } from "./models/User.js";
import authRoutes from "./routes/auth.js";
import doctorsRoutes from "./routes/doctors.js";
import appointmentsRoutes from "./routes/appointments.js";
import notificationsRoutes from "./routes/notifications.js";
import adminRoutes from "./routes/admin.js";
import doctorPortalRoutes from "./routes/doctorPortal.js";

const app = express();

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorPortalRoutes);

function mePayload(userDoc) {
  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    role: userDoc.role,
    specialty: userDoc.specialty || "",
    phone: userDoc.phone || "",
  };
}

app.get("/api/me", authRequired, (req, res) => {
  res.json({ user: mePayload(req.user) });
});

const patchProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    phone: z.string().max(40).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6).optional(),
  })
  .refine(
    (d) => d.name !== undefined || (d.newPassword !== undefined && d.newPassword.length > 0) || d.phone !== undefined,
    {
      message: "Provide name, phone, or newPassword",
      path: ["name"],
    }
  )
  .refine((d) => !d.newPassword || (d.currentPassword && d.currentPassword.length > 0), {
    message: "currentPassword is required when changing password",
    path: ["currentPassword"],
  });

app.patch("/api/me", authRequired, async (req, res) => {
  const parsed = patchProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const { name, phone, currentPassword, newPassword } = parsed.data;

  if (name === undefined && !newPassword && phone === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const fullUser = await User.findById(req.user._id);
  if (!fullUser) {
    return res.status(404).json({ error: "User not found" });
  }

  if (newPassword) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, fullUser.passwordHash))) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    fullUser.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (name !== undefined) {
    fullUser.name = name.trim();
  }

  if (phone !== undefined) {
    fullUser.phone = phone.trim();
  }

  await fullUser.save();
  const fresh = await User.findById(fullUser._id).select("-passwordHash").lean();
  res.json({ user: mePayload(fresh) });
});

app.get("/api/users", authRequired, requireRole("admin"), async (_req, res) => {
  const users = await User.find()
    .select("name email role specialty phone createdAt isActive")
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      specialty: u.specialty || "",
      phone: u.phone || "",
      isActive: u.isActive !== false,
      createdAt: u.createdAt,
    })),
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function main() {
  await mongoose.connect(config.mongoUri);
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
