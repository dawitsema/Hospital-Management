import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { NotificationBell } from "./NotificationBell.jsx";
import { LanguageSwitcher } from "./LanguageSwitcher.jsx";
import { HOSPITAL } from "../landing/constants.js";

export function Layout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Link to="/" className="portal-brand" title={t("portal.brandTitle")}>
          <span className="portal-brand-mark" aria-hidden="true">
            +
          </span>
          {HOSPITAL.name}
        </Link>
        {user && (
          <nav className="portal-nav">
            <NavLink to="/">{t("common.home")}</NavLink>
            {user.role === "patient" && (
              <NavLink to="/patient" end>
                <span className="portal-nav-full">{t("common.myAppointments")}</span>
                <span className="portal-nav-compact">{t("common.myVisits")}</span>
              </NavLink>
            )}
            {user.role === "doctor" && (
              <NavLink to="/doctor">
                <span className="portal-nav-full">{t("common.doctorDashboard")}</span>
                <span className="portal-nav-compact">{t("common.dashboardShort")}</span>
              </NavLink>
            )}
            {user.role === "admin" && <NavLink to="/admin">{t("common.admin")}</NavLink>}
            <NavLink to="/profile">{t("common.profile")}</NavLink>
            <LanguageSwitcher className="lang-switch--portal" />
            <NotificationBell />
            <span className="portal-user">
              {user.name} · {t(`common.role_${user.role}`)}
            </span>
            <button type="button" className="btn ghost" onClick={handleLogout}>
              {t("common.logOut")}
            </button>
          </nav>
        )}
      </header>
      <main className="portal-main">
        <Outlet />
      </main>
    </div>
  );
}
