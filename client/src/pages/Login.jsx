import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { AuthShell } from "../components/AuthShell.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const u = await login(email, password);
      navigate(from && from !== "/login" ? from : `/${u.role}`, { replace: true });
    } catch (err) {
      setError(err.message || t("auth.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <>
          {t("auth.loginFooterNew")} <Link to="/register">{t("auth.loginFooterCreate")}</Link>
          {" · "}
          <Link to="/forgot-password">{t("auth.loginFooterForgot")}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          <span>{t("common.email")}</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>{t("common.password")}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? t("auth.loginSigningIn") : t("common.signIn")}
        </button>
      </form>
    </AuthShell>
  );
}
