import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.phone !== undefined) setPhone(user.phone || "");
  }, [user?.name, user?.phone]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const wantsPwChange = newPassword.length > 0 || confirmPassword.length > 0 || currentPassword.length > 0;
    if (wantsPwChange) {
      if (!currentPassword) {
        setError(t("portal.enterCurrentPw"));
        return;
      }
      if (newPassword.length < 6) {
        setError(t("portal.pwMin6"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t("portal.pwMismatch"));
        return;
      }
    }

    const body = { name: name.trim(), phone: phone.trim() };
    if (wantsPwChange) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    if (!body.name) {
      setError(t("portal.nameEmpty"));
      return;
    }

    const phoneChanged = (user?.phone || "") !== body.phone;
    if (!wantsPwChange && body.name === user?.name && !phoneChanged) {
      setError(t("portal.noChanges"));
      return;
    }

    setSaving(true);
    try {
      await api("/api/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setSuccess(t("portal.profileUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshUser();
    } catch (err) {
      setError(err.data?.error || err.message || t("portal.profileUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-page stack lg">
      <header className="portal-page-head">
        <h1>{t("portal.profileTitle")}</h1>
        <p className="portal-lead">{t("portal.profileLead")}</p>
      </header>

      {error && <p className="error-banner">{error}</p>}
      {success && <p className="success-banner">{success}</p>}

      <section className="card">
        <h2>{t("portal.accountDetails")}</h2>
        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            <span>{t("common.email")}</span>
            <input type="email" value={user?.email || ""} disabled readOnly />
          </label>
          <div className="dashboard-form-grid">
            <label className="field">
              <span>{t("common.fullName")}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={120} autoComplete="name" />
            </label>
            <label className="field">
              <span>{t("common.phoneOptional")}</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                autoComplete="tel"
                placeholder="e.g. +251 9…"
              />
            </label>
          </div>
          {user?.role === "doctor" && user?.specialty ? (
            <p className="muted small">
              {t("portal.specialtyReadonly")} <strong>{user.specialty}</strong> {t("portal.specialtyReadonlyHint")}
            </p>
          ) : null}

          <h3 className="profile-section-title">{t("portal.changePwTitle")}</h3>
          <p className="muted small">{t("portal.changePwHint")}</p>
          <label className="field">
            <span>{t("portal.currentPw")}</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="field">
            <span>{t("portal.newPw")}</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label className="field">
            <span>{t("portal.confirmPw")}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? t("portal.profileSaving") : t("common.saveChanges")}
          </button>
        </form>
      </section>
    </div>
  );
}
