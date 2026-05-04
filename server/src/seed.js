import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { User } from "./models/User.js";
import { Appointment } from "./models/Appointment.js";
import { Notification } from "./models/Notification.js";
import { DoctorAvailability } from "./models/DoctorAvailability.js";
import { getBookableSlotsForDate } from "./lib/bookingSlots.js";

dotenv.config();

async function run() {
  await mongoose.connect(config.mongoUri);
  await Notification.deleteMany({});
  await Appointment.deleteMany({});
  await DoctorAvailability.deleteMany({});
  await User.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await User.create({
    email: "admin@hospital.test",
    passwordHash,
    name: "Admin User",
    role: "admin",
  });

  const drSmith = await User.create({
    email: "dr.smith@hospital.test",
    passwordHash,
    name: "Dr. Smith",
    role: "doctor",
    specialty: "General Practice",
  });

  const drJones = await User.create({
    email: "dr.jones@hospital.test",
    passwordHash,
    name: "Dr. Jones",
    role: "doctor",
    specialty: "Cardiology",
  });

  const dayStart = 8 * 60;
  const dayEnd = 20 * 60;
  for (const dow of [1, 2, 3, 4, 5, 6]) {
    await DoctorAvailability.create({
      doctorId: drSmith._id,
      dayOfWeek: dow,
      startMinute: dayStart,
      endMinute: dayEnd,
      active: true,
    });
    await DoctorAvailability.create({
      doctorId: drJones._id,
      dayOfWeek: dow,
      startMinute: dayStart,
      endMinute: dayEnd,
      active: true,
    });
  }

  const patient = await User.create({
    email: "patient@hospital.test",
    passwordHash,
    name: "Demo Patient",
    role: "patient",
  });

  for (let offset = 1; offset < 21; offset += 1) {
    const shifted = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
    const dateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(shifted);
    const slots = await getBookableSlotsForDate(drSmith._id, dateKey);
    if (slots.length) {
      await Appointment.create({
        patientId: patient._id,
        doctorId: drSmith._id,
        startTime: slots[0].startTime,
        endTime: slots[0].endTime,
        status: "scheduled",
        notes: "Seed demo appointment",
      });
      break;
    }
  }

  console.log("Seed complete.");
  console.log("---");
  console.log("Admin:   admin@hospital.test     / password123");
  console.log("Doctor:  dr.smith@hospital.test / password123");
  console.log("Doctor:  dr.jones@hospital.test / password123");
  console.log("Patient: patient@hospital.test  / password123");
  console.log("---");
  console.log(`Created users: admin=${admin._id}, doctors + 1 patient + 1 appointment`);

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
