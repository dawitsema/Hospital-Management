import { Link } from "react-router-dom";
import { HOSPITAL } from "../landing/constants.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { LanguageSwitcher } from "./LanguageSwitcher.jsx";

export function AuthShell({ title, subtitle, children, footer }) {
  const { t } = useLanguage();
  return (
    <div className="auth-portal">
      <div className="auth-portal-bg" aria-hidden="true" />
      <div className="auth-portal-orb a" aria-hidden="true" />
      <div className="auth-portal-orb b" aria-hidden="true" />
      <div className="auth-portal-inner">
        <div className="auth-portal-top">
          <Link to="/" className="auth-portal-brand">
            <span className="auth-portal-brand-mark" aria-hidden="true">
              +
            </span>
            {HOSPITAL.name}
          </Link>
          <div className="auth-portal-top-actions">
            <LanguageSwitcher className="lang-switch--auth" />
            <Link to="/" className="auth-portal-home">
              {t("common.backToSite")}
            </Link>
          </div>
        </div>
        <div className="auth-portal-card">
          <h1>{title}</h1>
          {subtitle ? <p className="auth-sub">{subtitle}</p> : null}
          {children}
        </div>
        {footer ? <div className="auth-portal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
