import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

/** Any signed-in user (patient, doctor, or admin). */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="portal-page">
        <div className="card muted">
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
