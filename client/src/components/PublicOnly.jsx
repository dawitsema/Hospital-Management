import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function PublicOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-portal">
        <div className="auth-portal-bg" aria-hidden="true" />
        <div className="auth-portal-inner" style={{ maxWidth: 360 }}>
          <div className="auth-portal-card">
            <p className="auth-sub" style={{ margin: 0 }}>
              Loading…
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
}
