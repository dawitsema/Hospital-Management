import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { DoctorAvailability } from "../models/DoctorAvailability.js";
import { authRequired } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const createSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startMinute: z.coerce.number().int().min(0).max(1440),
    endMinute: z.coerce.number().int().min(0).max(1440),
  })
  .refine((d) => d.endMinute > d.startMinute && d.endMinute - d.startMinute >= 30, {
    message: "Window must be at least 30 minutes and end after start",
    path: ["endMinute"],
  });

function serialize(doc) {
  return {
    id: doc._id.toString(),
    doctorId: doc.doctorId.toString(),
    dayOfWeek: doc.dayOfWeek,
    startMinute: doc.startMinute,
    endMinute: doc.endMinute,
    active: doc.active,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

router.use(authRequired, requireRole("doctor"));

router.get("/availability", async (req, res) => {
  const rows = await DoctorAvailability.find({ doctorId: req.user._id })
    .sort({ dayOfWeek: 1, startMinute: 1 })
    .lean();
  res.json({ availability: rows.map((r) => serialize(r)) });
});

router.post("/availability", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const { dayOfWeek, startMinute, endMinute } = parsed.data;
  const doc = await DoctorAvailability.create({
    doctorId: req.user._id,
    dayOfWeek,
    startMinute,
    endMinute,
    active: true,
  });
  return res.status(201).json({ slot: serialize(doc) });
});

const patchAvailSchema = z.object({
  active: z.boolean().optional(),
  startMinute: z.coerce.number().int().min(0).max(1440).optional(),
  endMinute: z.coerce.number().int().min(0).max(1440).optional(),
});

router.patch("/availability/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const parsed = patchAvailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const doc = await DoctorAvailability.findOne({ _id: req.params.id, doctorId: req.user._id });
  if (!doc) {
    return res.status(404).json({ error: "Not found" });
  }
  const { active, startMinute, endMinute } = parsed.data;
  if (active !== undefined) doc.active = active;
  if (startMinute !== undefined) doc.startMinute = startMinute;
  if (endMinute !== undefined) doc.endMinute = endMinute;
  if (doc.endMinute <= doc.startMinute || doc.endMinute - doc.startMinute < 30) {
    return res.status(400).json({ error: "Window must be at least 30 minutes and end after start" });
  }
  await doc.save();
  return res.json({ slot: serialize(doc) });
});

router.delete("/availability/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const r = await DoctorAvailability.deleteOne({ _id: req.params.id, doctorId: req.user._id });
  if (r.deletedCount === 0) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.json({ ok: true });
});

export default router;
