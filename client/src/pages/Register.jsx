import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { AuthShell } from "../components/AuthShell.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const u = await register({ name, email, password });
      navigate(`/${u.role}`, { replace: true });
    } catch (err) {
      const msg = err.data?.error || err.message || t("auth.registerFailed");
      setError(typeof msg === "string" ? msg : t("auth.registerFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footer={
        <>
          {t("auth.registerFooterHave")} <Link to="/login">{t("common.signIn")}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          <span>{t("common.fullName")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} />
        </label>
        <label className="field">
          <span>{t("common.email")}</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>{t("common.password")}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? t("auth.registerCreating") : t("common.register")}
        </button>
      </form>
    </AuthShell>
  );
}
