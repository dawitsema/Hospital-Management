import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { emitNotificationsRefresh } from "../lib/notifyUi.js";
import { validateClientBookingStart } from "../lib/appointmentUi.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const ADDIS_TZ = "Africa/Addis_Ababa";

function addisDateKeyFromMs(ms) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ADDIS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(ms)
  );
}

function formatRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString()} – ${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function PatientDashboard() {
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => ({
    doctorId: "",
    date: addisDateKeyFromMs(Date.now() + 86400000),
    slotIndex: "",
    notes: "",
  }));
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [resForm, setResForm] = useState({ date: "", slotIndex: "" });
  const [resSlots, setResSlots] = useState([]);
  const [resSlotsLoading, setResSlotsLoading] = useState(false);
  const [resSaving, setResSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [apRes, docRes] = await Promise.all([api("/api/appointments"), api("/api/doctors")]);
      setAppointments(apRes.appointments || []);
      setDoctors(docRes.doctors || []);
    } catch (e) {
      setError(e.message || t("portal.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setForm((f) => {
      if (f.doctorId || !doctors.length) return f;
      return { ...f, doctorId: doctors[0].id };
    });
  }, [doctors]);

  useEffect(() => {
    if (!form.doctorId || !form.date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    api(`/api/doctors/${form.doctorId}/slots?date=${encodeURIComponent(form.date)}`)
      .then((r) => {
        if (!cancelled) setSlots(r.slots || []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.doctorId, form.date]);

  useEffect(() => {
    if (!rescheduleAppt) {
      setResSlots([]);
      return;
    }
    const doctorId = rescheduleAppt.doctor?.id || rescheduleAppt.doctorId;
    const date = resForm.date;
    if (!doctorId || !date) return;
    let cancelled = false;
    setResSlotsLoading(true);
    api(`/api/doctors/${doctorId}/slots?date=${encodeURIComponent(date)}`)
      .then((r) => {
        if (!cancelled) setResSlots(r.slots || []);
      })
      .catch(() => {
        if (!cancelled) setResSlots([]);
      })
      .finally(() => {
        if (!cancelled) setResSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rescheduleAppt, resForm.date]);

  const { upcoming, past } = useMemo(() => {
    const nowMs = Date.now();
    const up = [];
    const pa = [];
    for (const a of appointments) {
      const endMs = new Date(a.endTime).getTime();
      if (endMs >= nowMs) up.push(a);
      else pa.push(a);
    }
    up.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    pa.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    return { upcoming: up, past: pa };
  }, [appointments]);

  async function book(e) {
    e.preventDefault();
    if (form.slotIndex === "") {
      setError(t("portal.chooseSlotError"));
      return;
    }
    const idx = Number(form.slotIndex);
    const slot = slots[idx];
    if (!slot) {
      setError(t("portal.invalidSlotSelection"));
      return;
    }
    const start = new Date(slot.startTime);
    const clientErr = validateClientBookingStart(start, t);
    if (clientErr) {
      setError(clientErr);
      return;
    }
    setBooking(true);
    setError("");
    try {
      await api("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          doctorId: form.doctorId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          notes: form.notes,
        }),
      });
      setForm((f) => ({ ...f, notes: "", slotIndex: "" }));
      await load();
      emitNotificationsRefresh();
    } catch (err) {
      setError(err.data?.error || err.message || t("portal.bookingFailed"));
    } finally {
      setBooking(false);
    }
  }

  async function cancelAppointment(id) {
    if (!window.confirm(t("portal.cancelConfirm"))) return;
    setError("");
    try {
      await api(`/api/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      await load();
      emitNotificationsRefresh();
    } catch (err) {
      setError(err.data?.error || err.message || t("portal.cancelFailed"));
    }
  }

  function openReschedule(a) {
    setRescheduleAppt(a);
    setResForm({
      date: addisDateKeyFromMs(new Date(a.startTime)),
      slotIndex: "",
    });
    setError("");
  }

  async function submitReschedule(e) {
    e.preventDefault();
    if (!rescheduleAppt) return;
    if (resForm.slotIndex === "") {
      setError(t("portal.chooseNewSlot"));
      return;
    }
    const idx = Number(resForm.slotIndex);
    const slot = resSlots[idx];
    if (!slot) {
      setError(t("portal.invalidSlotSelection"));
      return;
    }
    const start = new Date(slot.startTime);
    const clientErr = validateClientBookingStart(start, t);
    if (clientErr) {
      setError(clientErr);
      return;
    }
    setResSaving(true);
    setError("");
    try {
      await api(`/api/appointments/${rescheduleAppt.id}`, {
        method: "PATCH",
        body: JSON.stringify({ startTime: slot.startTime, endTime: slot.endTime }),
      });
      setRescheduleAppt(null);
      await load();
      emitNotificationsRefresh();
    } catch (err) {
      setError(err.data?.error || err.message || t("portal.rescheduleFailed"));
    } finally {
      setResSaving(false);
    }
  }

  function statusText(status) {
    const key = `portal.status_${status}`;
    const v = t(key);
    return v === key ? status : v;
  }

  function renderApptList(list, emptyMsg) {
    if (!list.length) {
      return <p className="muted">{emptyMsg}</p>;
    }
    return (
      <ul className="appt-list">
        {list.map((a) => (
          <li key={a.id} className="appt-row">
            <div>
              <strong>{a.doctor?.name || t("common.doctorFallback")}</strong>
              <div className="muted small">{formatRange(a.startTime, a.endTime)}</div>
              {a.notes ? <div className="small">{a.notes}</div> : null}
            </div>
            <div className="appt-meta">
              <span className={`pill ${a.status}`} title={a.status}>
                {statusText(a.status)}
              </span>
              {(a.status === "scheduled" || a.status === "pending") && (
                <>
                  <button type="button" className="btn small" onClick={() => openReschedule(a)}>
                    {t("common.reschedule")}
                  </button>
                  <button type="button" className="btn ghost danger" onClick={() => cancelAppointment(a.id)}>
                    {t("common.cancel")}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (loading) {
    return (
      <div className="portal-page">
        <div className="card muted">
          <p>{t("portal.loadingAppts")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page stack lg">
      <header className="portal-page-head">
        <h1>{t("portal.patientTitle")}</h1>
        <p className="portal-lead">{t("portal.patientLead")}</p>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <section className="card">
        <h2>{t("portal.bookTitle")}</h2>
        <form onSubmit={book} className="stack">
          <div className="dashboard-form-grid">
            <label className="field">
              <span>{t("common.doctorFallback")}</span>
              <select
                value={form.doctorId}
                onChange={(e) => setForm({ ...form, doctorId: e.target.value, slotIndex: "" })}
                required
              >
                <option value="" disabled>
                  {t("portal.chooseDoctor")}
                </option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.specialty ? ` — ${d.specialty}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("common.date")}</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value, slotIndex: "" })}
                required
              />
            </label>
            <label className="field field-span-full">
              <span>{t("common.timeSlot")}</span>
              <select
                value={form.slotIndex}
                onChange={(e) => setForm({ ...form, slotIndex: e.target.value })}
                required
                disabled={slotsLoading || !slots.length}
              >
                <option value="">
                  {slotsLoading ? t("common.loading") : slots.length ? t("portal.chooseTime") : t("portal.noSlotsDay")}
                </option>
                {slots.map((s, i) => (
                  <option key={`${s.startTime}-${i}`} value={String(i)}>
                    {formatRange(s.startTime, s.endTime)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>{t("common.notesOptional")}</span>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <button type="submit" className="btn primary" disabled={booking || !doctors.length}>
            {booking ? t("portal.submitting") : t("portal.requestAppt")}
          </button>
        </form>
      </section>

      {rescheduleAppt && (
        <section className="card">
          <h2>
            {t("portal.rescheduleTitle").replace(
              "{doctor}",
              rescheduleAppt.doctor?.name || t("common.doctorFallback")
            )}
          </h2>
          <form onSubmit={submitReschedule} className="stack">
            <div className="dashboard-form-grid">
              <label className="field">
                <span>{t("common.newDate")}</span>
                <input
                  type="date"
                  value={resForm.date}
                  onChange={(e) => setResForm({ ...resForm, date: e.target.value, slotIndex: "" })}
                  required
                />
              </label>
              <label className="field field-span-full">
                <span>{t("common.newTime")}</span>
                <select
                  value={resForm.slotIndex}
                  onChange={(e) => setResForm({ ...resForm, slotIndex: e.target.value })}
                  required
                  disabled={resSlotsLoading || !resSlots.length}
                >
                  <option value="">
                    {resSlotsLoading ? t("common.loading") : resSlots.length ? t("portal.chooseTime") : t("portal.noSlotsDay")}
                  </option>
                  {resSlots.map((s, i) => (
                    <option key={`${s.startTime}-r-${i}`} value={String(i)}>
                      {formatRange(s.startTime, s.endTime)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="btn-row">
              <button type="submit" className="btn primary" disabled={resSaving}>
                {resSaving ? t("portal.saving") : t("portal.saveNewTime")}
              </button>
              <button type="button" className="btn ghost" onClick={() => setRescheduleAppt(null)}>
                {t("common.close")}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <h2>{t("portal.upcomingTitle")}</h2>
        {renderApptList(upcoming, t("portal.noUpcoming"))}
      </section>

      <section className="card">
        <h2>{t("portal.pastTitle")}</h2>
        {renderApptList(past, t("portal.noPast"))}
      </section>
    </div>
  );
}
