import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { HOSPITAL, LANDING_IMAGES } from "./constants.js";

export default function LandingServices() {
  const { t } = useLanguage();

  return (
    <div className="landing-page">
      <div className="landing-page-inner">
        <h1>{t("landing.servicesTitle")}</h1>
        <p className="sub">{t("landing.servicesSub")}</p>
        <p className="lead">{t("landing.servicesLead").replace("{address}", HOSPITAL.addressLine)}</p>

        <div className="landing-split reverse">
          <figure className="landing-photo">
            <img
              src={LANDING_IMAGES.doctor}
              alt="Doctor in clinic attire reviewing care plans"
              loading="lazy"
              decoding="async"
              width={900}
              height={675}
            />
            <figcaption>{t("landing.servicesCaption")}</figcaption>
          </figure>
          <div>
            <h2 className="sub" style={{ marginTop: 0 }}>
              {t("landing.servicesTeamTitle")}
            </h2>
            <p className="lead" style={{ marginBottom: "1rem" }}>
              {t("landing.servicesTeamLead")}
            </p>
            <ul className="lead" style={{ paddingLeft: "1.2rem", margin: "0 0 1.25rem" }}>
              <li>{t("landing.servicesLi1")}</li>
              <li>{t("landing.servicesLi2")}</li>
              <li>{t("landing.servicesLi3")}</li>
            </ul>
            <Link to="/register" className="landing-btn landing-btn-solid">
              {t("landing.servicesBookCta")}
            </Link>
          </div>
        </div>

        <div className="landing-grid" style={{ marginTop: "2.5rem" }}>
          <article className="landing-card">
            <h3>{t("landing.servicesCard1Title")}</h3>
            <p>{t("landing.servicesCard1Body")}</p>
          </article>
          <article className="landing-card">
            <h3>{t("landing.servicesCard2Title")}</h3>
            <p>{t("landing.servicesCard2Body")}</p>
          </article>
          <article className="landing-card">
            <h3>{t("landing.servicesCard3Title")}</h3>
            <p>{t("landing.servicesCard3Body")}</p>
          </article>
        </div>
      </div>
    </div>
  );
}
