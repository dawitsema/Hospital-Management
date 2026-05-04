import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";

function fmtWhen(d) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Addis_Ababa",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d));
  } catch {
    return new Date(d).toISOString();
  }
}

async function push(userId, message, type, appointmentId) {
  if (!userId) return;
  await Notification.create({
    userId,
    message,
    type: type || "appointment",
    appointmentId: appointmentId || undefined,
    read: false,
  });
}

export async function onAppointmentCreated(appt, patientName, doctorName) {
  const when = fmtWhen(appt.startTime);
  await push(
    appt.patientId,
    `Booking recorded: ${doctorName} on ${when}. You will get another notice when it is approved or declined.`,
    "appointment_pending_patient",
    appt._id
  );
  await push(
    appt.doctorId,
    `${patientName} requested an appointment on ${when}. Please approve or decline.`,
    "appointment_pending_doctor",
    appt._id
  );
  const admins = await User.find({ role: "admin" }).select("_id").lean();
  await Promise.all(
    admins.map((a) =>
      push(
        a._id,
        `Pending appointment: ${patientName} → ${doctorName} on ${when}.`,
        "appointment_pending_admin",
        appt._id
      )
    )
  );
}

export async function onAppointmentApproved(appt, patientName, doctorName, actorRole) {
  const when = fmtWhen(appt.startTime);
  const by = actorRole === "admin" ? "an administrator" : "your doctor";
  await push(
    appt.patientId,
    `Your appointment with ${doctorName} on ${when} was approved by ${by}.`,
    "appointment_approved_patient",
    appt._id
  );
  await push(
    appt.doctorId,
    `Appointment with ${patientName} on ${when} is now confirmed.`,
    "appointment_approved_doctor",
    appt._id
  );
}

export async function onAppointmentRejected(appt, patientName, doctorName, actorRole) {
  const when = fmtWhen(appt.startTime);
  await push(
    appt.patientId,
    `Your appointment request with ${doctorName} on ${when} was declined. You may choose another time.`,
    "appointment_rejected_patient",
    appt._id
  );
  if (actorRole === "admin") {
    await push(
      appt.doctorId,
      `An administrator declined the request from ${patientName} for ${when}.`,
      "appointment_rejected_doctor",
      appt._id
    );
  }
}

export async function onAppointmentCancelled(appt, patientName, doctorName, actorRole) {
  const when = fmtWhen(appt.startTime);
  if (actorRole === "patient") {
    await push(
      appt.doctorId,
      `${patientName} cancelled the appointment on ${when}.`,
      "appointment_cancelled_doctor",
      appt._id
    );
  } else if (actorRole === "doctor") {
    await push(
      appt.patientId,
      `${doctorName} cancelled your appointment on ${when}.`,
      "appointment_cancelled_patient",
      appt._id
    );
  } else {
    await push(
      appt.patientId,
      `An administrator cancelled your appointment with ${doctorName} on ${when}.`,
      "appointment_cancelled_patient",
      appt._id
    );
    await push(
      appt.doctorId,
      `An administrator cancelled the appointment with ${patientName} on ${when}.`,
      "appointment_cancelled_doctor",
      appt._id
    );
  }
}

export async function onAppointmentCompleted(appt, patientName, doctorName) {
  const when = fmtWhen(appt.startTime);
  await push(
    appt.patientId,
    `Your visit with ${doctorName} on ${when} was marked completed. Thank you for choosing our care.`,
    "appointment_completed_patient",
    appt._id
  );
  await push(appt.doctorId, `Visit with ${patientName} on ${when} marked completed.`, "appointment_completed_doctor", appt._id);
}

export async function onAppointmentRescheduled(appt, patientName, doctorName, actorRole, prevStart) {
  const oldWhen = fmtWhen(prevStart);
  const newWhen = fmtWhen(appt.startTime);
  if (actorRole === "patient") {
    await push(
      appt.patientId,
      `You moved your visit with ${doctorName} from ${oldWhen} to ${newWhen}.`,
      "appointment_rescheduled_patient",
      appt._id
    );
  } else {
    const by = actorRole === "admin" ? "An administrator" : "Your doctor";
    await push(
      appt.patientId,
      `Your appointment with ${doctorName} was moved from ${oldWhen} to ${newWhen} (${by}).`,
      "appointment_rescheduled_patient",
      appt._id
    );
  }
  await push(
    appt.doctorId,
    `Appointment with ${patientName} rescheduled from ${oldWhen} to ${newWhen}.`,
    "appointment_rescheduled_doctor",
    appt._id
  );
}
