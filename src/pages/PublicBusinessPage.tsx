import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { usePublicBusiness } from '../hooks/usePublicBusiness'
import { applyBrandColorVars } from '../theme/brandColor'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

function whatsappHref(rawPhone: string, businessName: string): string {
  const digits = rawPhone.replace(/\D/g, '')
  const text = encodeURIComponent(`Hola, vengo de la página de ${businessName}`)
  return `https://wa.me/${digits}?text=${text}`
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l4.9-1.4A10 10 0 1 0 12 2Zm5.6 14.3c-.2.6-1.4 1.2-2 1.3-.5.1-1.1.1-1.8-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 1-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.5.7 1.8.8.3.1.5.2.5.3.1.2.1.7-.1 1.2Z" />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
  )
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
      />
    </svg>
  )
}

export default function PublicBusinessPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: business, isLoading } = usePublicBusiness(slug)

  useEffect(() => {
    if (business?.primaryColor) applyBrandColorVars(business.primaryColor)
  }, [business?.primaryColor])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50 px-4 text-center dark:bg-gray-900">
        <p className="font-serif text-xl font-semibold text-gray-700 dark:text-gray-200">
          No encontramos este negocio
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Revisa que el enlace esté completo y correcto.
        </p>
      </div>
    )
  }

  const waHref = business.whatsapp ? whatsappHref(business.whatsapp, business.name) : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="relative overflow-hidden bg-gradient-to-b from-brand to-brand-dark px-4 py-16 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-black/10 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-3xl animate-fade-in flex-col items-center gap-4 text-center">
          {business.logoUrl && (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-24 w-24 rounded-3xl bg-white object-contain p-3 shadow-lg ring-4 ring-white/30"
            />
          )}
          <h1 className="font-serif text-4xl font-semibold text-white drop-shadow-sm sm:text-5xl">
            {business.name}
          </h1>
          {business.description && (
            <p className="max-w-xl text-sm text-white/85 sm:text-base">{business.description}</p>
          )}
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-dark shadow-lg transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-xl"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Escríbenos por WhatsApp
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        {business.services.length > 0 && (
          <section className="mb-12 animate-fade-in">
            <h2 className="mb-4 font-serif text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Servicios
            </h2>
            <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
              {business.services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-150 hover:bg-brand-tint/60 dark:hover:bg-gray-700/60"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {service.name}
                    </p>
                    {service.durationMinutes && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {service.durationMinutes} min
                      </p>
                    )}
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold text-brand-dark dark:text-brand-light">
                    {currency.format(service.price)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {business.branches.length > 0 && (
          <section className="animate-fade-in">
            <h2 className="mb-4 font-serif text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Sucursales
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {business.branches.map((branch) => (
                <div
                  key={branch.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {branch.name}
                  </p>
                  <div className="space-y-1.5">
                    {branch.address && (
                      <p className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <MapPinIcon className="mt-0.5 h-4 w-4 flex-none text-brand" />
                        {branch.address}
                      </p>
                    )}
                    {branch.hours && (
                      <p className="flex items-center gap-2 text-xs text-gray-400">
                        <ClockIcon className="h-4 w-4 flex-none text-brand" />
                        {branch.hours}
                      </p>
                    )}
                    {branch.phone && (
                      <a
                        href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                        className="flex items-center gap-2 text-xs font-medium text-brand-dark hover:underline dark:text-brand-light"
                      >
                        <PhoneIcon className="h-4 w-4 flex-none text-brand" />
                        {branch.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="px-4 pb-24 pt-4 text-center sm:pb-10">
        <p className="font-platform text-xs text-gray-400">Hecho con RB Suite</p>
      </footer>

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-150 hover:-translate-y-0.5 hover:bg-brand-dark"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <WhatsAppIcon className="h-5 w-5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}
    </div>
  )
}
