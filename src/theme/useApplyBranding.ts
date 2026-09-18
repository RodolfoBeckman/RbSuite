import { useEffect } from 'react'
import { useBranding } from '../hooks/useBranding'
import { applyBrandColorVars } from './brandColor'

// El admin solo elige un color; dark/light/tint se derivan de ahí para no
// pedirle que arme una paleta completa. Se aplican como CSS custom
// properties para que el cambio se vea sin rebuild — cada negocio ve su
// propio color en el mismo build de la app.
export function useApplyBranding() {
  const { data: branding } = useBranding()

  useEffect(() => {
    if (!branding?.primaryColor) return
    applyBrandColorVars(branding.primaryColor)
  }, [branding?.primaryColor])
}
