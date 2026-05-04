import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import { emitNotificationsRefresh } from "../lib/notifyUi.js";
import { useLanguage } from "../context/LanguageContext.jsx";

function formatRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString()} – ${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

const emptyDoctorForm = { name: "", email: "", password: "", specialty: "" };

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("appointments");
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doctorForm, setDoctorForm] = useState(emptyDoctorForm);
  const [doctorSaving, setDoctorSaving] = useState(false);
  const [doctorFormError, setDoctorFormError] = useState("");
  const [doctorSuccess, setDoctorSuccess] = useState("");

  const [stats, setStats] = useState(null);
  const [deactivatingId, setDeactivatingId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [u, a, s] = await Promise.all([api("/api/users"), api("/api/appointments"), api("/api/admin/stats")]);
      setUsers(u.users || []);
      setAppointments(a.appointments || []);
      setStats(s);
    } catch (e) {
      setError(e.message || t("portal.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function createDoctor(e) {
    e.preventDefault();
    setDoctorFormError("");
    setDoctorSuccess("");
    setDoctorSaving(true);
    try {
      await api("/api/admin/doctors", {
        method: "POST",
        body: JSON.stringify({
          name: doctorForm.name.trim(),
          email: doctorForm.email.trim(),
          password: doctorForm.password,
          specialty: doctorForm.specialty.trim(),
        }),
      });
      setDoctorForm(emptyDoctorForm);
      setDoctorSuccess(t("portal.doctorCreated"));
      await load();
    } catch (err) {
      setDoctorFormError(err.data?.error || err.message || t("portal.couldNotCreateDoctor"));
    } finally {
      setDoctorSaving(false);
    }
  }

  async function setAppointmentStatus(id, status) {
    setError("");
    try {
      await api(`/api/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
      emitNotificationsRefresh();
    } catch (err) {
      setError(err.data?.error || err.message || t("portal.updateApptFailed"));
    }
  }

  async function deactivateDoctor(u) {
    if (u.role !== "doctor" || !u.isActive) return;
    if (!window.confirm(t("portal.deactivateConfirm").replace("{name}", u.name))) return;
    setDeactivatingId(u.id);
    setError("");
    try {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      await load();
      emitNotificationsRefresh();
    } catch (err) {
      if (err.status === 409 && err.data?.activeAppointmentCount != null) {
        const n = err.data.activeAppointmentCount;
        if (window.confirm(t("portal.deactivateForceConfirm").replace("{n}", String(n)))) {
          try {
            await api(`/api/admin/users/${u.id}?force=true`, { method: "DELETE" });
            await load();
            emitNotificationsRefresh();
          } catch (err2) {
            setError(err2.data?.error || err2.message || t("portal.deactivateFailed"));
          }
        }
      } else {
        setError(err.data?.error || err.message || t("portal.deactivateFailed"));
      }
    } finally {
      setDeactivatingId(null);
    }
  }

  function statusText(status) {
    const key = `portal.status_${status}`;
    const v = t(key);
    return v === key ? status : v;
  }

  function roleText(role) {
    const key = `common.role_${role}`;
    const v = t(key);
    return v === key ? role : v;
  }

  if (loading) {
    return (
      <div className="portal-page">
        <div className="card muted">
          <p>{t("portal.loadingAdmin")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page stack lg">
      <header className="portal-page-head">
        <h1>{t("portal.adminTitle")}</h1>
        <p className="portal-lead">{t("portal.adminLead")}</p>
      </header>
      {error && <p className="error-banner">{error}</p>}

      {stats && (
        <section className="card">
          <h2>{t("portal.overviewTitle")}</h2>
          <div className="stats-overview-grid">
            <div className="muted small stats-intro">{t("portal.overviewIntro")}</div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statPatients")}</span>
              <strong className="stat-card-value">{stats.users.patients}</strong>
            </div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statDoctors")}</span>
              <strong className="stat-card-value">{stats.users.doctors}</strong>
            </div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statAdmins")}</span>
              <strong className="stat-card-value">{stats.users.admins}</strong>
            </div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statAllUsers")}</span>
              <strong className="stat-card-value">{stats.users.total}</strong>
            </div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statApptsTotal")}</span>
              <strong className="stat-card-value">{stats.appointments.total}</strong>
            </div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statPending")}</span>
              <strong className="stat-card-value">{stats.appointments.byStatus.pending}</strong>
            </div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statScheduled")}</span>
              <strong className="stat-card-value">{stats.appointments.byStatus.scheduled}</strong>
            </div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statCompleted")}</span>
              <strong className="stat-card-value">{stats.appointments.byStatus.completed}</strong>
            </div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statCancelled")}</span>
              <strong className="stat-card-value">{stats.appointments.byStatus.cancelled}</strong>
            </div>
            <div className="stat-card">
              <span className="muted small">{t("portal.statRejected")}</span>
              <strong className="stat-card-value">{stats.appointments.byStatus.rejected}</strong>
            </div>
          </div>
        </section>
      )}

      <div className="tabs">
        <button type="button" className={tab === "appointments" ? "active" : ""} onClick={() => setTab("appointments")}>
          {t("portal.tabAppts")}
        </button>
        <button type="button" className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
          {t("portal.tabUsers")}
        </button>
      </div>

      {tab === "users" && (
        <>
          <section className="card">
            <h2>{t("portal.addDoctorTitle")}</h2>
            <p className="muted small" style={{ margin: "0 0 0.65rem" }}>
              {t("portal.addDoctorHint")}
            </p>
            {doctorFormError && <p className="error-banner">{doctorFormError}</p>}
            {doctorSuccess && <p className="success-banner">{doctorSuccess}</p>}
            <form onSubmit={createDoctor} className="stack">
              <div className="dashboard-form-grid">
                <label className="field">
                  <span>{t("common.fullName")}</span>
                  <input
                    value={doctorForm.name}
                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                    required
                    autoComplete="name"
                  />
                </label>
                <label className="field">
                  <span>{t("portal.workEmail")}</span>
                  <input
                    type="email"
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                    required
                    autoComplete="off"
                  />
                </label>
                <label className="field">
                  <span>{t("portal.tempPassword")}</span>
                  <input
                    type="password"
                    value={doctorForm.password}
                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </label>
                <label className="field">
                  <span>{t("portal.specialtyOptional")}</span>
                  <input
                    value={doctorForm.specialty}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                    placeholder={t("portal.specialtyPh")}
                    autoComplete="off"
                  />
                </label>
              </div>
              <button type="submit" className="btn primary" disabled={doctorSaving}>
                {doctorSaving ? t("portal.creating") : t("portal.createDoctor")}
              </button>
            </form>
          </section>

          <section className="card">
            <h2>{t("portal.usersCount").replace("{n}", String(users.length))}</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("portal.colName")}</th>
                    <th>{t("portal.colEmail")}</th>
                    <th>{t("portal.colPhone")}</th>
                    <th>{t("portal.colRole")}</th>
                    <th>{t("portal.colSpecialty")}</th>
                    <th>{t("portal.colActive")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || t("common.none")}</td>
                      <td>{roleText(u.role)}</td>
                      <td>{u.specialty || t("common.none")}</td>
                      <td>{u.isActive ? t("common.yes") : t("common.no")}</td>
                      <td>
                        {u.role === "doctor" && u.isActive ? (
                          <button
                            type="button"
                            className="btn small ghost danger"
                            disabled={deactivatingId === u.id}
                            onClick={() => deactivateDoctor(u)}
                          >
                            {deactivatingId === u.id ? t("portal.deactivating") : t("common.deactivate")}
                          </button>
                        ) : (
                          t("common.none")
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "appointments" && (
        <section className="card">
          <h2>{t("portal.apptsCount").replace("{n}", String(appointments.length))}</h2>
          {!appointments.length ? (
            <p className="muted">{t("portal.noAppts")}</p>
          ) : (
            <ul className="appt-list">
              {appointments.map((a) => (
                <li key={a.id} className="appt-row">
                  <div>
                    <strong>
                      {a.patient?.name} → {a.doctor?.name}
                    </strong>
                    <div className="muted small">{formatRange(a.startTime, a.endTime)}</div>
                    {a.notes ? <div className="small">{a.notes}</div> : null}
                  </div>
                  <div className="appt-meta">
                    <span className={`pill ${a.status}`} title={a.status}>
                      {statusText(a.status)}
                    </span>
                    {a.status === "pending" && (
                      <div className="btn-row">
                        <button type="button" className="btn small primary" onClick={() => setAppointmentStatus(a.id, "scheduled")}>
                          {t("common.approve")}
                        </button>
                        <button type="button" className="btn small ghost danger" onClick={() => setAppointmentStatus(a.id, "rejected")}>
                          {t("common.decline")}
                        </button>
                      </div>
                    )}
                    {a.status === "scheduled" && (
                      <div className="btn-row">
                        <button type="button" className="btn small" onClick={() => setAppointmentStatus(a.id, "completed")}>
                          {t("portal.complete")}
                        </button>
                        <button type="button" className="btn small ghost danger" onClick={() => setAppointmentStatus(a.id, "cancelled")}>
                          {t("portal.cancel")}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
