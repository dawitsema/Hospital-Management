import mongoose from "mongoose";

/** Weekly template: same local weekday in Africa/Addis_Ababa (Sun=0 … Sat=6). */
const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startMinute: { type: Number, required: true },
    endMinute: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

doctorAvailabilitySchema.index({ doctorId: 1, dayOfWeek: 1, active: 1 });

export const DoctorAvailability = mongoose.model("DoctorAvailability", doctorAvailabilitySchema);
