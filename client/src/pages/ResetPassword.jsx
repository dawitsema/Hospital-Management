import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { AuthShell } from "../components/AuthShell.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ResetPassword() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 6) {
      setError(t("auth.resetPwTooShort"));
      return;
    }
    if (newPassword !== confirm) {
      setError(t("auth.resetPwMismatch"));
      return;
    }
    if (!token.trim()) {
      setError(t("auth.resetTokenMissing"));
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      setSuccess(t("auth.resetSuccess"));
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(err.data?.error || err.message || t("auth.resetFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.resetTitle")}
      subtitle={t("auth.resetSubtitle")}
      footer={
        <>
          <Link to="/login">{t("auth.resetFooterSignIn")}</Link>
          {" · "}
          <Link to="/forgot-password">{t("auth.resetFooterNewToken")}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          <span>{t("auth.resetTokenLabel")}</span>
          <textarea
            rows={3}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            autoComplete="off"
            placeholder={t("auth.resetTokenPlaceholder")}
          />
        </label>
        <label className="field">
          <span>{t("auth.resetNewPw")}</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="field">
          <span>{t("auth.resetConfirmPw")}</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-banner">{success}</p>}
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? t("auth.resetUpdating") : t("auth.resetSetPw")}
        </button>
      </form>
    </AuthShell>
  );
}
