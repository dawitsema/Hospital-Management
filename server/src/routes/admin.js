import { Router } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { Appointment } from "../models/Appointment.js";
import { authRequired } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { onAppointmentCancelled } from "../services/appointmentEvents.js";

const router = Router();

const createDoctorSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(6),
  specialty: z.string().max(200).optional().default(""),
});

router.use(authRequired, requireRole("admin"));

router.get("/stats", async (_req, res) => {
  const [patients, doctors, admins, totalAppointments, statusAgg] = await Promise.all([
    User.countDocuments({ role: "patient" }),
    User.countDocuments({ role: "doctor" }),
    User.countDocuments({ role: "admin" }),
    Appointment.countDocuments(),
    Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const byStatus = {
    pending: 0,
    scheduled: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
  };
  for (const row of statusAgg) {
    if (row._id && Object.prototype.hasOwnProperty.call(byStatus, row._id)) {
      byStatus[row._id] = row.count;
    }
  }
  res.json({
    users: {
      patients,
      doctors,
      admins,
      total: patients + doctors + admins,
    },
    appointments: {
      total: totalAppointments,
      byStatus,
    },
  });
});

router.post("/doctors", async (req, res) => {
  const parsed = createDoctorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const { name, email, password, specialty } = parsed.data;
  const emailLower = email.toLowerCase();
  const existing = await User.findOne({ email: emailLower });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const doctor = await User.create({
    email: emailLower,
    passwordHash,
    name: name.trim(),
    role: "doctor",
    specialty: (specialty || "").trim(),
  });
  return res.status(201).json({
    user: {
      id: doctor._id.toString(),
      name: doctor.name,
      email: doctor.email,
      role: doctor.role,
      specialty: doctor.specialty || "",
      createdAt: doctor.createdAt,
    },
  });
});

router.delete("/users/:id", async (req, res) => {
  const force = req.query.force === "true" || req.query.force === "1";
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }
  if (String(target._id) === String(req.user._id)) {
    return res.status(400).json({ error: "You cannot deactivate your own account" });
  }
  if (target.role !== "doctor") {
    return res.status(400).json({ error: "Only doctor accounts can be deactivated via this endpoint" });
  }
  if (target.isActive === false) {
    return res.status(400).json({ error: "Account is already deactivated" });
  }
  const blocking = await Appointment.find({
    doctorId: target._id,
    status: { $in: ["pending", "scheduled"] },
  })
    .select("_id")
    .lean();
  if (blocking.length && !force) {
    return res.status(409).json({
      error:
        "This doctor has active appointments. Retry with ?force=true to cancel those appointments and deactivate the doctor.",
      activeAppointmentCount: blocking.length,
    });
  }
  if (blocking.length && force) {
    for (const b of blocking) {
      const apptDoc = await Appointment.findById(b._id);
      if (!apptDoc) continue;
      apptDoc.status = "cancelled";
      await apptDoc.save();
      const pop = await Appointment.findById(apptDoc._id).populate("patientId", "name").populate("doctorId", "name").lean();
      if (!pop) continue;
      const patientName = pop.patientId?.name || "Patient";
      const doctorName = pop.doctorId?.name || "Doctor";
      await onAppointmentCancelled(
        { _id: pop._id, patientId: pop.patientId._id, doctorId: pop.doctorId._id, startTime: pop.startTime },
        patientName,
        doctorName,
        "admin"
      );
    }
  }
  target.isActive = false;
  await target.save();
  return res.json({ ok: true, message: "Doctor account deactivated. They can no longer sign in." });
});

export default router;
