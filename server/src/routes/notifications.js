import { Router } from "express";
import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.use(authRequired);

router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  const [items, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId: req.user._id, read: false }),
  ]);
  return res.json({
    unreadCount,
    notifications: items.map((n) => ({
      id: n._id.toString(),
      message: n.message,
      type: n.type,
      read: n.read,
      appointmentId: n.appointmentId ? n.appointmentId.toString() : null,
      createdAt: n.createdAt,
    })),
  });
});

router.patch("/:id/read", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true },
    { new: true }
  ).lean();
  if (!n) {
    return res.status(404).json({ error: "Notification not found" });
  }
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
  return res.json({
    notification: {
      id: n._id.toString(),
      message: n.message,
      type: n.type,
      read: n.read,
      appointmentId: n.appointmentId ? n.appointmentId.toString() : null,
      createdAt: n.createdAt,
    },
    unreadCount,
  });
});

router.post("/read-all", async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  return res.json({ ok: true, unreadCount: 0 });
});

export default router;
