import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { Layout } from "./components/Layout.jsx";
import { RequireRole } from "./components/RequireRole.jsx";
import { RequireAuth } from "./components/RequireAuth.jsx";
import { PublicOnly } from "./components/PublicOnly.jsx";
import LandingLayout from "./landing/LandingLayout.jsx";
import LandingHome from "./landing/LandingHome.jsx";
import LandingAbout from "./landing/LandingAbout.jsx";
import LandingServices from "./landing/LandingServices.jsx";
import LandingContact from "./landing/LandingContact.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Profile from "./pages/Profile.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnly>
                <ForgotPassword />
              </PublicOnly>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicOnly>
                <ResetPassword />
              </PublicOnly>
            }
          />
          <Route path="/" element={<LandingLayout />}>
            <Route index element={<LandingHome />} />
            <Route path="about" element={<LandingAbout />} />
            <Route path="services" element={<LandingServices />} />
            <Route path="contact" element={<LandingContact />} />
          </Route>
          <Route element={<Layout />}>
            <Route
              path="/patient"
              element={
                <RequireRole roles={["patient"]}>
                  <PatientDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/doctor"
              element={
                <RequireRole roles={["doctor"]}>
                  <DoctorDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole roles={["admin"]}>
                  <AdminDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
