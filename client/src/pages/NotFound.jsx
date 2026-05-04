import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <main className="not-found-page">
      <div className="not-found-card card">
        <p className="not-found-code" aria-hidden="true">
          {t("common.notFoundCode")}
        </p>
        <h1>{t("common.notFoundTitle")}</h1>
        <p className="muted">{t("common.notFoundLead")}</p>
        <Link to="/" className="btn primary">
          {t("common.backToHome")}
        </Link>
      </div>
    </main>
  );
}
