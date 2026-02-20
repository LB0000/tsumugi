import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAdminStore } from './stores/adminStore';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContentPage } from './pages/ContentPage';
import { CustomersPage } from './pages/CustomersPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { StrategyPage } from './pages/StrategyPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SettingsPage } from './pages/PlaceholderPage';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/strategy" element={<StrategyPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
