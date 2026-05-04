import mongoose from "mongoose";

const STATUSES = ["pending", "scheduled", "rejected", "cancelled", "completed"];

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: "pending" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorId: 1, startTime: 1 });
appointmentSchema.index({ patientId: 1, startTime: -1 });

export const Appointment = mongoose.model("Appointment", appointmentSchema);
export const APPOINTMENT_STATUSES = STATUSES;
