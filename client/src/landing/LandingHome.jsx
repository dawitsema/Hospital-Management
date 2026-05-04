import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { HOSPITAL, LANDING_IMAGES } from "./constants.js";

export default function LandingHome() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const dashPath = user ? `/${user.role}` : null;

  return (
    <section className="landing-hero" aria-labelledby="hero-heading">
      <div className="landing-hero-media" aria-hidden="true">
        <img src={LANDING_IMAGES.addisHero} alt="" loading="eager" decoding="async" />
      </div>
      <div className="landing-hero-overlay" aria-hidden="true" />
      <div className="landing-orb landing-orb-1" aria-hidden="true" />
      <div className="landing-orb landing-orb-2" aria-hidden="true" />
      <div className="landing-hero-inner">
        <div className="landing-hero-copy">
          <span className="am">{HOSPITAL.nameAm}</span>
          <h1 id="hero-heading">
            <span className="landing-hero-heading-line">{t("landing.heroHeading")}</span>
          </h1>
          <p>{t("landing.heroLead")}</p>
          <div className="landing-hero-actions">
            {!loading && dashPath ? (
              <Link to={dashPath} className="landing-btn landing-btn-solid">
                {t("common.goToPortal")}
              </Link>
            ) : (
              <Link to="/register" className="landing-btn landing-btn-solid">
                {t("landing.heroBookFirst")}
              </Link>
            )}
            <Link to="/services" className="landing-btn landing-btn-ghost">
              {t("landing.heroOurServices")}
            </Link>
            <Link to="/about" className="landing-btn landing-btn-ghost">
              {t("landing.heroAboutUs")}
            </Link>
          </div>
        </div>
        <aside className="landing-hero-card" aria-labelledby="why-selam-heading">
          <figure className="landing-why-visual">
            <img
              src={LANDING_IMAGES.hospitalBuilding}
              alt={`${HOSPITAL.name} — hospital and patient care`}
              width={900}
              height={520}
              loading="lazy"
              decoding="async"
            />
          </figure>
          <h3 id="why-selam-heading">{t("landing.whyHeading").replace("{name}", HOSPITAL.name.split(" ")[0])}</h3>
          <ul>
            <li>{t("landing.whyLi1")}</li>
            <li>{t("landing.whyLi2")}</li>
            <li>{t("landing.whyLi3")}</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
