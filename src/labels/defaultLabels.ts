// Textos de UI personalizables por negocio (businesses.settings.labels).
// Ej. una ferretería podría renombrar "Servicios" a algo que le aplique
// más, o quitarlo. Siempre hay un valor por defecto razonable — un
// negocio sin settings configurados ve exactamente estos textos.
export interface Labels {
  navDashboard: string
  navPos: string
  navCaja: string
  navVentas: string
  posTitle: string
}

export const DEFAULT_LABELS: Labels = {
  navDashboard: 'Dashboard',
  navPos: 'Punto de venta',
  navCaja: 'Caja',
  navVentas: 'Ventas',
  posTitle: 'Punto de venta',
}
