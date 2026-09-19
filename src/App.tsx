import { Routes, Route } from 'react-router-dom'
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
import ReportesPage from './pages/ReportesPage'
import SettingsPage, {
  SettingsIndexRedirect,
  BrandingSection,
  BranchesSection,
  TeamSection,
  LabelsSection,
  PosLayoutSection,
  ModulesSection,
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
          <Route element={<ProtectedRoute requiredModule="caja" />}>
            <Route path="/caja" element={<CajaPage />} />
          </Route>
          <Route path="/ventas" element={<SalesHistoryPage />} />
          <Route
            element={<ProtectedRoute allowedRoles={['administrador', 'gerente']} requiredModule="inventario" />}
          >
            <Route path="/inventario" element={<InventoryPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['administrador', 'gerente']} />}>
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/configuracion" element={<SettingsPage />}>
              <Route index element={<SettingsIndexRedirect />} />
              <Route path="marca" element={<BrandingSection />} />
              <Route path="sucursales" element={<BranchesSection />} />
              <Route path="equipo" element={<TeamSection />} />
              <Route path="etiquetas" element={<LabelsSection />} />
              <Route path="punto-de-venta" element={<PosLayoutSection />} />
              <Route path="modulos" element={<ModulesSection />} />
              <Route path="pagina-publica" element={<PublicPageSection />} />
              <Route path="auditoria" element={<AuditLogSection />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
