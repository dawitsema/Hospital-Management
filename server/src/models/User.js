import mongoose from "mongoose";

const ROLES = ["patient", "doctor", "admin"];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, required: true, default: "patient" },
    specialty: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
export const USER_ROLES = ROLES;
