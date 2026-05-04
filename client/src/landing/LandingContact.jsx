import { useLanguage } from "../context/LanguageContext.jsx";
import { HOSPITAL, MAPS } from "./constants.js";

const MAPS_OPEN_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS.openQuery)}`;

export default function LandingContact() {
  const { t } = useLanguage();

  return (
    <div className="landing-page">
      <div className="landing-page-inner">
        <h1>{t("landing.contactTitle")}</h1>
        <p className="sub">{t("landing.contactSub")}</p>
        <p className="lead">{t("landing.contactLead").replace("{phone}", HOSPITAL.phoneDisplay)}</p>

        <div className="landing-contact">
          <div>
            <strong>{t("landing.contactPhoneLabel")}</strong>
            <div>
              <a href={`tel:${HOSPITAL.phoneTel}`}>{HOSPITAL.phoneDisplay}</a>
            </div>
          </div>
          <div>
            <strong>{t("landing.contactEmailLabel")}</strong>
            <div>
              <a href={`mailto:${HOSPITAL.email}`}>{HOSPITAL.email}</a>
            </div>
          </div>
          <div>
            <strong>{t("landing.contactAddressLabel")}</strong>
            <div className="landing-hours">
              {HOSPITAL.addressLine}
              <br />
              {HOSPITAL.country}
            </div>
          </div>
          <div>
            <strong>{t("landing.contactHoursLabel")}</strong>
            <div className="landing-hours">{HOSPITAL.hours}</div>
          </div>
        </div>

        <section className="landing-map-block" aria-labelledby="map-heading">
          <h2 id="map-heading" className="landing-map-title">
            {t("landing.mapTitle")}
          </h2>
          <p className="lead landing-map-lead">{t("landing.mapLead")}</p>
          <div className="landing-map-frame">
            <iframe title="Map — Bole, Addis Ababa" loading="lazy" src={MAPS.embedUrl} referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <div className="landing-map-actions">
            <a className="landing-btn landing-btn-solid" href={MAPS_OPEN_URL} target="_blank" rel="noopener noreferrer">
              {t("landing.mapOpen")}
            </a>
            <a className="landing-btn landing-btn-ghost" href={MAPS_OPEN_URL} target="_blank" rel="noopener noreferrer">
              {t("landing.mapLarger")}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
