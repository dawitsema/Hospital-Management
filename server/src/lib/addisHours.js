/** Clinic rules in Africa/Addis_Ababa (EAT, no DST). */
const TZ = "Africa/Addis_Ababa";

function addisDateKey(d) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function addisWeekdayShort(d) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
}

function addisHourMinute(d) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const o = {};
  for (const p of parts) {
    if (p.type !== "literal") o[p.type] = p.value;
  }
  return { hour: Number(o.hour), minute: Number(o.minute) };
}

function toMinutes(h, m) {
  return h * 60 + m;
}

/**
 * @returns {string|null} Error message or null if OK.
 */
export function validateAppointmentSlot(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid date";
  }
  if (end <= start) {
    return "End time must be after start time";
  }

  const now = Date.now();
  const skewMs = 60_000;
  if (start.getTime() < now - skewMs) {
    return "Cannot book appointments in the past";
  }

  const minLeadMs = 30 * 60 * 1000;
  if (start.getTime() < now + minLeadMs) {
    return "Appointments must be at least 30 minutes in the future";
  }

  const wd = addisWeekdayShort(start);
  if (wd === "Sun") {
    return "Clinic is closed on Sundays — please choose Monday through Saturday";
  }

  if (addisDateKey(start) !== addisDateKey(end)) {
    return "Appointment must start and end on the same calendar day in Addis Ababa";
  }

  const sh = addisHourMinute(start);
  const eh = addisHourMinute(end);
  const startM = toMinutes(sh.hour, sh.minute);
  const endM = toMinutes(eh.hour, eh.minute);
  const open = 8 * 60;
  const close = 20 * 60;

  if (startM < open || startM >= close) {
    return "Start time must be within clinic hours 08:00–20:00 (Addis Ababa)";
  }
  if (endM > close) {
    return "Appointment must end by 20:00 (Addis Ababa)";
  }

  return null;
}
