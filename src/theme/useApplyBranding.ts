import { useEffect } from 'react'
import { useBranding } from '../hooks/useBranding'

function hexToRgbTriple(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `${r} ${g} ${b}`
}

// percent negativo oscurece, positivo aclara — mismo truco simple que usan
// la mayoría de los generadores de paleta de un solo color.
function shade(hex: string, percent: number): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  const amt = Math.round(2.55 * percent)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amt))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt))
  return `${r} ${g} ${b}`
}

// El admin solo elige un color; dark/light/tint se derivan de ahí para no
// pedirle que arme una paleta completa. Se aplican como CSS custom
// properties (leídas por los tokens `brand.*` de tailwind.config.js) para
// que el cambio se vea sin rebuild — cada negocio ve su propio color en el
// mismo build de la app.
export function useApplyBranding() {
  const { data: branding } = useBranding()

  useEffect(() => {
    if (!branding?.primaryColor) return
    const root = document.documentElement
    root.style.setProperty('--brand', hexToRgbTriple(branding.primaryColor))
    root.style.setProperty('--brand-dark', shade(branding.primaryColor, -25))
    root.style.setProperty('--brand-light', shade(branding.primaryColor, 35))
    root.style.setProperty('--brand-tint', shade(branding.primaryColor, 85))
  }, [branding?.primaryColor])
}
