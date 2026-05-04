import { useLanguage } from "../context/LanguageContext.jsx";

/** Compact language selector (English / አማርኛ). */
export function LanguageSwitcher({ className = "" }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className={`lang-switch ${className}`.trim()}>
      <span className="visually-hidden">{t("common.language")}</span>
      <select
        className="lang-switch-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        aria-label={t("common.language")}
      >
        <option value="en">{t("common.langEnglish")}</option>
        <option value="am">{t("common.langAmharic")}</option>
      </select>
    </label>
  );
}
