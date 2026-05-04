import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Appointment } from "../models/Appointment.js";
import { User } from "../models/User.js";
import { authRequired } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateAppointmentSlot } from "../lib/addisHours.js";
import {
  onAppointmentApproved,
  onAppointmentCancelled,
  onAppointmentCompleted,
  onAppointmentCreated,
  onAppointmentRejected,
  onAppointmentRescheduled,
} from "../services/appointmentEvents.js";
import { doctorHasAvailabilityTemplates, isSlotPublishedAndFree } from "../lib/bookingSlots.js";

const router = Router();

const createSchema = z.object({
  doctorId: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  notes: z.string().max(2000).optional().default(""),
});

const patchSchema = z
  .object({
    status: z.enum(["pending", "scheduled", "rejected", "cancelled", "completed"]).optional(),
    notes: z.string().max(2000).optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
  })
  .refine((d) => !(d.status !== undefined && (d.startTime !== undefined || d.endTime !== undefined)), {
    message: "Cannot change status and appointment time in the same request",
    path: ["status"],
  })
  .refine(
    (d) => {
      const hasT = d.startTime !== undefined || d.endTime !== undefined;
      if (!hasT) return true;
      return d.startTime !== undefined && d.endTime !== undefined;
    },
    { message: "Both startTime and endTime are required to reschedule", path: ["startTime"] }
  );

const DEFAULT_DURATION_MS = 30 * 60 * 1000;

const BLOCKING_STATUSES = ["pending", "scheduled"];

async function hasDoctorOverlap(doctorId, startTime, endTime, excludeId) {
  const filter = {
    doctorId,
    status: { $in: BLOCKING_STATUSES },
    $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  const clash = await Appointment.findOne(filter).lean();
  return Boolean(clash);
}

function canViewAppointment(user, doc) {
  if (user.role === "admin") return true;
  if (user.role === "patient" && doc.patientId.toString() === user._id.toString()) return true;
  if (user.role === "doctor" && doc.doctorId.toString() === user._id.toString()) return true;
  return false;
}

function assertStatusChange(user, doc, next) {
  const cur = doc.status;
  if (cur === next) {
    return { ok: true };
  }
  if (["rejected", "cancelled", "completed"].includes(cur)) {
    return { ok: false, error: "This appointment can no longer be changed" };
  }

  if (user.role === "patient") {
    if (doc.patientId.toString() !== user._id.toString()) {
      return { ok: false, error: "Forbidden" };
    }
    if (next !== "cancelled") {
      return { ok: false, error: "Patients may only cancel appointments" };
    }
    if (!["pending", "scheduled"].includes(cur)) {
      return { ok: false, error: "Cannot cancel this appointment" };
    }
    return { ok: true };
  }

  if (user.role === "doctor") {
    if (doc.doctorId.toString() !== user._id.toString()) {
      return { ok: false, error: "Forbidden" };
    }
    if (cur === "pending") {
      if (!["scheduled", "rejected", "cancelled"].includes(next)) {
        return { ok: false, error: "Invalid status for a pending request" };
      }
      return { ok: true };
    }
    if (cur === "scheduled") {
      if (!["completed", "cancelled"].includes(next)) {
        return { ok: false, error: "Invalid status for a confirmed visit" };
      }
      return { ok: true };
    }
    return { ok: false, error: "Forbidden" };
  }

  if (user.role === "admin") {
    if (cur === "pending") {
      if (!["scheduled", "rejected", "cancelled"].includes(next)) {
        return { ok: false, error: "Invalid status for a pending request" };
      }
      return { ok: true };
    }
    if (cur === "scheduled") {
      if (!["completed", "cancelled"].includes(next)) {
        return { ok: false, error: "Invalid status for a confirmed visit" };
      }
      return { ok: true };
    }
    return { ok: false, error: "Cannot change status" };
  }

  return { ok: false, error: "Forbidden" };
}

function canRescheduleTimes(user, doc) {
  if (!["pending", "scheduled"].includes(doc.status)) {
    return { ok: false, error: "Only pending or confirmed visits can be rescheduled" };
  }
  if (user.role === "admin") return { ok: true };
  if (user.role === "patient" && doc.patientId.toString() !== user._id.toString()) {
    return { ok: false, error: "Forbidden" };
  }
  if (user.role === "doctor" && doc.doctorId.toString() !== user._id.toString()) {
    return { ok: false, error: "Forbidden" };
  }
  if (user.role === "patient" || user.role === "doctor") return { ok: true };
  return { ok: false, error: "Forbidden" };
}

function serialize(doc, populated = false) {
  const o = {
    id: doc._id.toString(),
    startTime: doc.startTime,
    endTime: doc.endTime,
    status: doc.status,
    notes: doc.notes || "",
  };
  if (populated && doc.patientId && typeof doc.patientId === "object") {
    o.patient = {
      id: doc.patientId._id.toString(),
      name: doc.patientId.name,
      email: doc.patientId.email,
    };
  } else {
    o.patientId = doc.patientId?._id?.toString?.() || doc.patientId?.toString?.() || String(doc.patientId);
  }
  if (populated && doc.doctorId && typeof doc.doctorId === "object") {
    o.doctor = {
      id: doc.doctorId._id.toString(),
      name: doc.doctorId.name,
      email: doc.doctorId.email,
      specialty: doc.doctorId.specialty || "",
    };
  } else {
    o.doctorId = doc.doctorId?._id?.toString?.() || doc.doctorId?.toString?.() || String(doc.doctorId);
  }
  return o;
}

async function loadNames(appt) {
  const populated = await Appointment.findById(appt._id)
    .populate("patientId", "name")
    .populate("doctorId", "name")
    .lean();
  return {
    patientName: populated?.patientId?.name || "Patient",
    doctorName: populated?.doctorId?.name || "Doctor",
  };
}

router.use(authRequired);

router.get("/", async (req, res) => {
  const { user } = req;
  let query = {};
  if (user.role === "patient") {
    query.patientId = user._id;
  } else if (user.role === "doctor") {
    query.doctorId = user._id;
  }
  const list = await Appointment.find(query)
    .sort({ startTime: 1 })
    .populate("patientId", "name email")
    .populate("doctorId", "name email specialty")
    .lean();
  return res.json({ appointments: list.map((d) => serialize(d, true)) });
});

router.post("/", requireRole("patient"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  let { doctorId, startTime, endTime, notes } = parsed.data;
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ error: "Invalid doctor id" });
  }
  const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
  if (!doctor) {
    return res.status(400).json({ error: "Doctor not found" });
  }
  if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) {
    return res.status(400).json({ error: "Invalid start time" });
  }
  if (!endTime || Number.isNaN(endTime.getTime())) {
    endTime = new Date(startTime.getTime() + DEFAULT_DURATION_MS);
  }
  const slotErr = validateAppointmentSlot(startTime, endTime);
  if (slotErr) {
    return res.status(400).json({ error: slotErr });
  }
  const hasTpl = await doctorHasAvailabilityTemplates(doctor._id);
  if (!hasTpl) {
    return res.status(400).json({
      error:
        "This doctor has not published weekly availability yet. They must add availability in the doctor portal before patients can book.",
    });
  }
  const slotOk = await isSlotPublishedAndFree(doctor._id, startTime, endTime);
  if (!slotOk) {
    return res.status(400).json({ error: "Pick an open slot from this doctor's published availability" });
  }
  const created = await Appointment.create({
    patientId: req.user._id,
    doctorId: doctor._id,
    startTime,
    endTime,
    notes: notes || "",
    status: "pending",
  });
  const populated = await Appointment.findById(created._id)
    .populate("patientId", "name email")
    .populate("doctorId", "name email specialty")
    .lean();
  const { patientName, doctorName } = await loadNames(created);
  await onAppointmentCreated(created, patientName, doctorName);
  return res.status(201).json({ appointment: serialize(populated, true) });
});

router.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const doc = await Appointment.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: "Appointment not found" });
  }
  if (!canViewAppointment(req.user, doc)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const updates = parsed.data;

  if (updates.startTime !== undefined && updates.endTime !== undefined) {
    const perm = canRescheduleTimes(req.user, doc);
    if (!perm.ok) {
      return res.status(perm.error === "Forbidden" ? 403 : 400).json({ error: perm.error });
    }
    const slotErr = validateAppointmentSlot(updates.startTime, updates.endTime);
    if (slotErr) {
      return res.status(400).json({ error: slotErr });
    }
    const hasTpl = await doctorHasAvailabilityTemplates(doc.doctorId);
    if (!hasTpl) {
      return res.status(400).json({ error: "Doctor has no published availability" });
    }
    const slotOk = await isSlotPublishedAndFree(doc.doctorId, updates.startTime, updates.endTime, doc._id);
    if (!slotOk) {
      return res.status(400).json({ error: "Pick an open slot from this doctor's published availability" });
    }
    const overlap = await hasDoctorOverlap(doc.doctorId, updates.startTime, updates.endTime, doc._id);
    if (overlap) {
      return res.status(409).json({ error: "This time slot conflicts with another booking for this doctor" });
    }
    const prevStart = doc.startTime;
    const prevEnd = doc.endTime;
    doc.startTime = updates.startTime;
    doc.endTime = updates.endTime;
    await doc.save();
    const timeChanged = prevStart.getTime() !== doc.startTime.getTime() || prevEnd.getTime() !== doc.endTime.getTime();
    if (timeChanged) {
      const { patientName, doctorName } = await loadNames(doc);
      await onAppointmentRescheduled(doc, patientName, doctorName, req.user.role, prevStart);
    }
    const populated = await Appointment.findById(doc._id)
      .populate("patientId", "name email")
      .populate("doctorId", "name email specialty")
      .lean();
    return res.json({ appointment: serialize(populated, true) });
  }

  const prevStatus = doc.status;

  if (updates.status !== undefined) {
    const check = assertStatusChange(req.user, doc, updates.status);
    if (!check.ok) {
      return res.status(check.error === "Forbidden" ? 403 : 400).json({ error: check.error });
    }
    doc.status = updates.status;
  }

  if (updates.notes !== undefined) {
    if (req.user.role === "patient" && doc.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (req.user.role === "patient") {
      doc.notes = updates.notes;
    } else if (req.user.role === "doctor" && doc.doctorId.toString() === req.user._id.toString()) {
      doc.notes = updates.notes;
    } else if (req.user.role === "admin") {
      doc.notes = updates.notes;
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  await doc.save();

  const nextStatus = doc.status;
  if (updates.status !== undefined && prevStatus !== nextStatus) {
    const { patientName, doctorName } = await loadNames(doc);
    if (prevStatus === "pending" && nextStatus === "scheduled") {
      await onAppointmentApproved(doc, patientName, doctorName, req.user.role);
    } else if (prevStatus === "pending" && nextStatus === "rejected") {
      await onAppointmentRejected(doc, patientName, doctorName, req.user.role);
    } else if (nextStatus === "cancelled" && prevStatus !== "cancelled") {
      await onAppointmentCancelled(doc, patientName, doctorName, req.user.role);
    } else if (prevStatus === "scheduled" && nextStatus === "completed") {
      await onAppointmentCompleted(doc, patientName, doctorName);
    }
  }

  const populated = await Appointment.findById(doc._id)
    .populate("patientId", "name email")
    .populate("doctorId", "name email specialty")
    .lean();
  return res.json({ appointment: serialize(populated, true) });
});

export default router;
