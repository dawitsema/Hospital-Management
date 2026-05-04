import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { AuthShell } from "../components/AuthShell.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [devToken, setDevToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    setDevToken("");
    try {
      const data = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setMsg(data.message || t("auth.forgotMsgGeneric"));
      if (data.resetToken) {
        setDevToken(data.resetToken);
      }
    } catch (err) {
      setMsg(err.message || t("auth.requestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.forgotTitle")}
      subtitle={t("auth.forgotSubtitle")}
      footer={
        <>
          <Link to="/login">{t("auth.forgotFooterBack")}</Link>
          {" · "}
          <Link to="/reset-password">{t("auth.forgotFooterReset")}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          <span>{t("common.email")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        {msg && <p className="muted small">{msg}</p>}
        {devToken && (
          <div className="card muted" style={{ padding: "0.75rem" }}>
            <p className="small" style={{ marginBottom: "0.5rem" }}>
              <strong>{t("auth.forgotDevTokenLabel")}</strong> {t("auth.forgotDevTokenParen")}
            </p>
            <code style={{ wordBreak: "break-all", fontSize: "0.8rem" }}>{devToken}</code>
            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              {t("auth.forgotUseResetPage")}{" "}
              <Link to={`/reset-password?token=${encodeURIComponent(devToken)}`}>{t("auth.forgotResetPageLink")}</Link>{" "}
              {t("auth.forgotPageSuffix")}
            </p>
          </div>
        )}
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? t("auth.forgotSending") : t("auth.forgotRequest")}
        </button>
      </form>
    </AuthShell>
  );
}
