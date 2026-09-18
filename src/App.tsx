import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import SetPasswordPage from './pages/SetPasswordPage'
import PublicBusinessPage from './pages/PublicBusinessPage'
import DashboardPage from './pages/DashboardPage'
import PosPage from './pages/PosPage'
import CajaPage from './pages/CajaPage'
import SalesHistoryPage from './pages/SalesHistoryPage'
import InventoryPage from './pages/InventoryPage'
import SettingsPage, {
  BrandingSection,
  BranchesSection,
  TeamSection,
  LabelsSection,
  PublicPageSection,
  AuditLogSection,
} from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invitacion" element={<SetPasswordPage />} />
      <Route path="/negocio/:slug" element={<PublicBusinessPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/caja" element={<CajaPage />} />
          <Route path="/ventas" element={<SalesHistoryPage />} />
          <Route element={<ProtectedRoute allowedRoles={['administrador', 'gerente']} />}>
            <Route path="/inventario" element={<InventoryPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['administrador']} />}>
            <Route path="/configuracion" element={<SettingsPage />}>
              <Route index element={<Navigate to="marca" replace />} />
              <Route path="marca" element={<BrandingSection />} />
              <Route path="sucursales" element={<BranchesSection />} />
              <Route path="equipo" element={<TeamSection />} />
              <Route path="etiquetas" element={<LabelsSection />} />
              <Route path="pagina-publica" element={<PublicPageSection />} />
              <Route path="auditoria" element={<AuditLogSection />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
