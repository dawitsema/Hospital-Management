import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { getBookableSlotsForDate } from "../lib/bookingSlots.js";

const router = Router();

router.get("/:id/slots", async (req, res) => {
  const { id } = req.params;
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid doctor id" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Query parameter date=YYYY-MM-DD is required" });
  }
  const doctor = await User.findOne({ _id: id, role: "doctor", isActive: { $ne: false } }).lean();
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }
  const slots = await getBookableSlotsForDate(doctor._id, date);
  return res.json({
    slots: slots.map((s) => ({
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    })),
  });
});

router.get("/", async (_req, res) => {
  const doctors = await User.find({ role: "doctor", isActive: { $ne: false } })
    .select("name email specialty")
    .sort({ name: 1 })
    .lean();
  return res.json({
    doctors: doctors.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      email: d.email,
      specialty: d.specialty || "",
    })),
  });
});

export default router;
