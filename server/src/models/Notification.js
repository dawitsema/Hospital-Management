import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    type: { type: String, trim: true, default: "general" },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
