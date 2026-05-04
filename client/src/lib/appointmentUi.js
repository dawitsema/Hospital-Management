export function statusLabel(status) {
  switch (status) {
    case "pending":
      return "Pending approval";
    case "scheduled":
      return "Approved";
    case "rejected":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

export function minLocalDatetimeInput() {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/**
 * @param {Date} start
 * @param {(key: string) => string} [t] i18n function; if omitted, English fallbacks are returned.
 */
export function validateClientBookingStart(start, t) {
  const ts = start.getTime();
  const now = Date.now();
  if (ts < now - 60_000) {
    return t ? t("portal.validatePast") : "Cannot book appointments in the past.";
  }
  if (ts < now + 30 * 60 * 1000) {
    return t ? t("portal.validate30min") : "Choose a time at least 30 minutes from now.";
  }
  return null;
}
