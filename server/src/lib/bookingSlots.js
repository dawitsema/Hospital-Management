import { DoctorAvailability } from "../models/DoctorAvailability.js";
import { Appointment } from "../models/Appointment.js";
import { validateAppointmentSlot } from "./addisHours.js";

const TZ = "Africa/Addis_Ababa";
const SLOT_MS = 30 * 60 * 1000;
const BLOCKING_STATUSES = ["pending", "scheduled"];

function addisWeekdayShort(d) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
}

/** Sun=0 … Sat=6 for the instant `d` in Addis Ababa. */
export function addisWeekdayNumber(d) {
  const wd = addisWeekdayShort(d);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? 0;
}

/** Start of civil calendar day in Addis (EAT, fixed +03:00). */
export function addisDayStartUtc(dateStr) {
  return new Date(`${dateStr}T00:00:00+03:00`);
}

/**
 * @param {import("mongoose").Types.ObjectId} doctorId
 * @param {string} dateStr YYYY-MM-DD (Addis calendar day)
 * @param {import("mongoose").Types.ObjectId} [excludeAppointmentId]
 * @returns {Promise<{ startTime: Date; endTime: Date }[]>}
 */
export async function getBookableSlotsForDate(doctorId, dateStr, excludeAppointmentId) {
  const dayStart = addisDayStartUtc(dateStr);
  if (Number.isNaN(dayStart.getTime())) {
    return [];
  }
  const dow = addisWeekdayNumber(dayStart);
  const templates = await DoctorAvailability.find({
    doctorId,
    dayOfWeek: dow,
    active: true,
  })
    .sort({ startMinute: 1 })
    .lean();

  if (!templates.length) {
    return [];
  }

  const apptFilter = {
    doctorId,
    status: { $in: BLOCKING_STATUSES },
    startTime: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) },
  };
  if (excludeAppointmentId) {
    apptFilter._id = { $ne: excludeAppointmentId };
  }
  const appts = await Appointment.find(apptFilter).select("startTime endTime").lean();

  function overlapsExisting(s, e) {
    return appts.some((a) => a.startTime < e && a.endTime > s);
  }

  /** @type { { startTime: Date; endTime: Date }[] } */
  const out = [];
  for (const t of templates) {
    let m = t.startMinute;
    while (m + 30 <= t.endMinute) {
      const slotStart = new Date(dayStart.getTime() + m * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + SLOT_MS);
      const slotErr = validateAppointmentSlot(slotStart, slotEnd);
      if (!slotErr && !overlapsExisting(slotStart, slotEnd)) {
        out.push({ startTime: slotStart, endTime: slotEnd });
      }
      m += 30;
    }
  }
  out.sort((a, b) => a.startTime - b.startTime);
  return out;
}

/**
 * True if doctor has at least one active weekly template.
 * @param {import("mongoose").Types.ObjectId} doctorId
 */
export async function doctorHasAvailabilityTemplates(doctorId) {
  const n = await DoctorAvailability.countDocuments({ doctorId, active: true });
  return n > 0;
}

/**
 * @param {import("mongoose").Types.ObjectId} doctorId
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {import("mongoose").Types.ObjectId} [excludeAppointmentId]
 */
export async function isSlotPublishedAndFree(doctorId, startTime, endTime, excludeAppointmentId) {
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    startTime
  );
  const slots = await getBookableSlotsForDate(doctorId, dateStr, excludeAppointmentId);
  return slots.some(
    (s) =>
      Math.abs(s.startTime.getTime() - startTime.getTime()) < 2000 &&
      Math.abs(s.endTime.getTime() - endTime.getTime()) < 2000
  );
}
