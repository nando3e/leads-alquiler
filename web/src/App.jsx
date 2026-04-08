import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import FormPage from './pages/FormPage';
import LoginPage from './pages/LoginPage';
import PanelLayout from './pages/PanelLayout';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import AlertRulesPage from './pages/AlertRulesPage';
import AlertSentPage from './pages/AlertSentPage';
import PropertiesPage from './pages/PropertiesPage';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/form" element={<FormPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/panel"
        element={
          <ProtectedRoute>
            <PanelLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="alert-rules" element={<AlertRulesPage />} />
        <Route path="alert-sent" element={<AlertSentPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/form" replace />} />
      <Route path="*" element={<Navigate to="/form" replace />} />
    </Routes>
  );
}
