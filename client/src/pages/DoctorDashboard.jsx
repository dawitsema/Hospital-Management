import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { emitNotificationsRefresh } from "../lib/notifyUi.js";
import { validateClientBookingStart } from "../lib/appointmentUi.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

const ADDIS_TZ = "Africa/Addis_Ababa";

const DAY_INDEX_KEYS = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"];

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

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availForm, setAvailForm] = useState({
    dayOfWeek: 1,
    windowStart: "09:00",
    windowEnd: "17:00",
  });
  const [availSaving, setAvailSaving] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [resForm, setResForm] = useState({ date: "", slotIndex: "" });
  const [resSlots, setResSlots] = useState([]);
  const [resSlotsLoading, setResSlotsLoading] = useState(false);
  const [resSaving, setResSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [apRes, avRes] = await Promise.all([api("/api/appointments"), api("/api/doctor/availability")]);
      setAppointments(apRes.appointments || []);
      setAvailability(avRes.availability || []);
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
    if (!rescheduleAppt || !user?.id) {
      setResSlots([]);
      return;
    }
    const date = resForm.date;
    if (!date) return;
    let cancelled = false;
    setResSlotsLoading(true);
    api(`/api/doctors/${user.id}/slots?date=${encodeURIComponent(date)}`)
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
  }, [rescheduleAppt, resForm.date, user?.id]);

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

  async function updateStatus(id, status) {
    setError("");
    try {
      await api(`/api/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
      emitNotificationsRefresh();
    } catch (err) {
      setError(err.data?.error || err.message || t("portal.updateFailed"));
    }
  }

  async function addAvailability(e) {
    e.preventDefault();
    setAvailSaving(true);
    setError("");
    try {
      const startMinute = timeToMinutes(availForm.windowStart);
      const endMinute = timeToMinutes(availForm.windowEnd);
      await api("/api/doctor/availability", {
        method: "POST",
        body: JSON.stringify({
          dayOfWeek: Number(availForm.dayOfWeek),
          startMinute,
          endMinute,
        }),
      });
      await load();
    } catch (err) {
      setError(err.data?.error || err.message || t("portal.availAddFailed"));
    } finally {
      setAvailSaving(false);
    }
  }

  async function deleteAvailability(id) {
    if (!window.confirm(t("portal.removeAvailConfirm"))) return;
    setError("");
    try {
      await api(`/api/doctor/availability/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.data?.error || err.message || t("portal.deleteFailed"));
    }
  }

  async function toggleAvailability(id, active) {
    setError("");
    try {
      await api(`/api/doctor/availability/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !active }),
      });
      await load();
    } catch (err) {
      setError(err.data?.error || err.message || t("portal.updateFailed"));
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

  function weekdayLabel(i) {
    return t(`portal.${DAY_INDEX_KEYS[i]}`);
  }

  function statusText(status) {
    const key = `portal.status_${status}`;
    const v = t(key);
    return v === key ? status : v;
  }

  function renderApptList(list, title, emptyMsg) {
    return (
      <>
        <h3 style={{ marginTop: "1rem", fontSize: "1rem" }}>{title}</h3>
        {!list.length ? (
          <p className="muted">{emptyMsg}</p>
        ) : (
          <ul className="appt-list">
            {list.map((a) => (
              <li key={a.id} className="appt-row">
                <div>
                  <strong>{a.patient?.name || t("common.patientFallback")}</strong>
                  <div className="muted small">{a.patient?.email}</div>
                  <div className="muted small">{formatRange(a.startTime, a.endTime)}</div>
                  {a.notes ? <div className="small">{a.notes}</div> : null}
                </div>
                <div className="appt-meta">
                  <span className={`pill ${a.status}`} title={a.status}>
                    {statusText(a.status)}
                  </span>
                  {a.status === "pending" && (
                    <div className="btn-row">
                      <button type="button" className="btn small primary" onClick={() => updateStatus(a.id, "scheduled")}>
                        {t("common.approve")}
                      </button>
                      <button type="button" className="btn small ghost danger" onClick={() => updateStatus(a.id, "rejected")}>
                        {t("common.decline")}
                      </button>
                      <button type="button" className="btn small" onClick={() => openReschedule(a)}>
                        {t("common.reschedule")}
                      </button>
                    </div>
                  )}
                  {a.status === "scheduled" && (
                    <div className="btn-row">
                      <button type="button" className="btn small" onClick={() => updateStatus(a.id, "completed")}>
                        {t("common.markCompleted")}
                      </button>
                      <button type="button" className="btn small" onClick={() => openReschedule(a)}>
                        {t("common.reschedule")}
                      </button>
                      <button type="button" className="btn small ghost danger" onClick={() => updateStatus(a.id, "cancelled")}>
                        {t("common.cancelVisit")}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  if (loading) {
    return (
      <div className="portal-page">
        <div className="card muted">
          <p>{t("portal.loadingSchedule")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page stack lg">
      <header className="portal-page-head">
        <h1>{t("portal.doctorTitle")}</h1>
        <p className="portal-lead">{t("portal.doctorLead")}</p>
      </header>
      {error && <p className="error-banner">{error}</p>}

      <section className="card">
        <h2>{t("portal.availTitle")}</h2>
        <p className="muted small" style={{ margin: "0 0 0.65rem" }}>
          {t("portal.availHint")}
        </p>
        <form onSubmit={addAvailability} className="stack" style={{ marginBottom: "0.75rem" }}>
          <div className="dashboard-form-grid">
            <label className="field">
              <span>{t("portal.weekday")}</span>
              <select
                value={availForm.dayOfWeek}
                onChange={(e) => setAvailForm({ ...availForm, dayOfWeek: Number(e.target.value) })}
              >
                {DAY_INDEX_KEYS.map((_, v) => (
                  <option key={v} value={v}>
                    {weekdayLabel(v)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("portal.timeFrom")}</span>
              <input
                type="time"
                value={availForm.windowStart}
                onChange={(e) => setAvailForm({ ...availForm, windowStart: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>{t("portal.timeTo")}</span>
              <input
                type="time"
                value={availForm.windowEnd}
                onChange={(e) => setAvailForm({ ...availForm, windowEnd: e.target.value })}
                required
              />
            </label>
          </div>
          <button type="submit" className="btn primary" disabled={availSaving}>
            {availSaving ? t("portal.addSaving") : t("portal.addWindow")}
          </button>
        </form>
        {!availability.length ? (
          <p className="muted">{t("portal.availEmpty")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("portal.availColDay")}</th>
                  <th>{t("portal.availColWindow")}</th>
                  <th>{t("portal.availColActive")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {availability.map((row) => (
                  <tr key={row.id}>
                    <td>{weekdayLabel(row.dayOfWeek)}</td>
                    <td>
                      {minutesToTime(row.startMinute)} – {minutesToTime(row.endMinute)}
                    </td>
                    <td>{row.active ? t("common.yes") : t("common.no")}</td>
                    <td>
                      <div className="btn-row">
                        <button type="button" className="btn small" onClick={() => toggleAvailability(row.id, row.active)}>
                          {row.active ? t("portal.availPause") : t("portal.availResume")}
                        </button>
                        <button type="button" className="btn small ghost danger" onClick={() => deleteAvailability(row.id)}>
                          {t("portal.availRemove")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rescheduleAppt && (
        <section className="card">
          <h2>
            {t("portal.reschedulePatient").replace(
              "{patient}",
              rescheduleAppt.patient?.name || t("common.patientFallback")
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
                    <option key={`${s.startTime}-dr-${i}`} value={String(i)}>
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
        <h2>{t("portal.apptsTitle")}</h2>
        {renderApptList(upcoming, t("common.upcoming"), t("portal.noUpcomingDr"))}
        {renderApptList(past, t("common.past"), t("portal.noPastDr"))}
      </section>
    </div>
  );
}
