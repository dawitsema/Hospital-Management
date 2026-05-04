import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { HOSPITAL, LANDING_IMAGES } from "./constants.js";

export default function LandingAbout() {
  const { t } = useLanguage();
  const area = HOSPITAL.addressLine.split("—")[0].trim();

  return (
    <div className="landing-page">
      <div className="landing-page-inner">
        <h1>{t("landing.aboutTitle")}</h1>
        <p className="sub">{HOSPITAL.nameAm}</p>
        <p className="lead">{t("landing.aboutLead1").replace("{name}", HOSPITAL.name)}</p>

        <div className="landing-split">
          <figure className="landing-photo">
            <img
              src={LANDING_IMAGES.patient}
              alt="Patient speaking with a caregiver in a bright clinic"
              loading="lazy"
              decoding="async"
              width={900}
              height={675}
            />
            <figcaption>{t("landing.aboutCaption")}</figcaption>
          </figure>
          <div>
            <h2 className="sub" style={{ marginTop: 0 }}>
              {t("landing.aboutCommunityTitle")}
            </h2>
            <p className="lead" style={{ marginBottom: "1rem" }}>
              {t("landing.aboutCommunityLead1").replace("{area}", area)}
            </p>
            <p className="lead" style={{ marginBottom: "1.25rem" }}>
              {t("landing.aboutCommunityLead2")}
            </p>
            <Link to="/contact" className="landing-btn landing-btn-solid">
              {t("landing.aboutVisitCta")}
            </Link>
          </div>
        </div>

        <div className="landing-grid" style={{ marginTop: "2.5rem" }}>
          <article className="landing-card">
            <h3>{t("landing.aboutCard1Title")}</h3>
            <p>{t("landing.aboutCard1Body")}</p>
          </article>
          <article className="landing-card">
            <h3>{t("landing.aboutCard2Title")}</h3>
            <p>{t("landing.aboutCard2Body")}</p>
          </article>
          <article className="landing-card">
            <h3>{t("landing.aboutCard3Title")}</h3>
            <p>{t("landing.aboutCard3Body")}</p>
          </article>
        </div>
      </div>
    </div>
  );
}
