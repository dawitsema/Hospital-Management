import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { HOSPITAL } from "./constants.js";
import { SOCIAL_LINKS } from "./socialLinks.jsx";
import { LanguageSwitcher } from "../components/LanguageSwitcher.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import "./landing.css";

export default function LandingLayout() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const dashPath = user ? `/${user.role}` : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing">
      <header className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <Link to="/" className="landing-brand">
          <span className="landing-brand-mark" aria-hidden="true">
            +
          </span>
          {HOSPITAL.name}
        </Link>
        <nav className="landing-nav-links" aria-label={t("landing.navAria")}>
          <NavLink to="/" end>
            {t("common.home")}
          </NavLink>
          <NavLink to="/about">{t("common.about")}</NavLink>
          <NavLink to="/services">{t("common.services")}</NavLink>
          <NavLink to="/contact">{t("common.contact")}</NavLink>
          <LanguageSwitcher className="lang-switch--landing" />
          <span className="landing-nav-cta">
            {!loading && dashPath ? (
              <Link to={dashPath} className="landing-btn landing-btn-solid">
                {t("common.dashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="landing-btn landing-btn-ghost">
                  {t("common.signIn")}
                </Link>
                <Link to="/register" className="landing-btn landing-btn-solid">
                  {t("common.register")}
                </Link>
              </>
            )}
          </span>
        </nav>
      </header>

      <main className="landing-main">
        <Outlet />
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <strong>{HOSPITAL.name}</strong>
            <span>
              {HOSPITAL.addressLine} · {HOSPITAL.country}
              <br />
              {HOSPITAL.phoneDisplay} · {HOSPITAL.email}
            </span>
          </div>
          <div className="landing-social">
            <span className="landing-social-label">{t("landing.footerFollow")}</span>
            <div className="landing-social-links">
              {SOCIAL_LINKS.map(({ name, href, icon }) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        <p className="landing-footer-copy">
          © {new Date().getFullYear()} {HOSPITAL.name}. {t("landing.footerCopySuffix")}
        </p>
      </footer>
    </div>
  );
}
