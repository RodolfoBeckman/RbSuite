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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-brand-tint px-4 py-12 dark:bg-gray-800 sm:py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          {business.logoUrl && (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-sm"
            />
          )}
          <h1 className="font-serif text-3xl font-semibold text-brand-dark dark:text-brand-light sm:text-4xl">
            {business.name}
          </h1>
          {business.description && (
            <p className="max-w-xl text-sm text-gray-600 dark:text-gray-300 sm:text-base">
              {business.description}
            </p>
          )}
          {business.whatsapp && (
            <a
              href={whatsappHref(business.whatsapp, business.name)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-brand-dark"
            >
              Escríbenos por WhatsApp
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        {business.services.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 font-serif text-xl font-semibold text-gray-800 dark:text-gray-100">
              Servicios
            </h2>
            <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
              {business.services.map((service) => (
                <div key={service.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {service.name}
                    </p>
                    {service.durationMinutes && (
                      <p className="text-xs text-gray-400">{service.durationMinutes} min</p>
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
          <section>
            <h2 className="mb-4 font-serif text-xl font-semibold text-gray-800 dark:text-gray-100">
              Sucursales
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {business.branches.map((branch) => (
                <div
                  key={branch.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
                >
                  <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {branch.name}
                  </p>
                  {branch.address && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{branch.address}</p>
                  )}
                  {branch.hours && (
                    <p className="mt-2 text-xs text-gray-400">{branch.hours}</p>
                  )}
                  {branch.phone && (
                    <a
                      href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                      className="mt-1 block text-xs font-medium text-brand-dark dark:text-brand-light"
                    >
                      {branch.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="px-4 pb-10 text-center">
        <p className="font-platform text-xs text-gray-400">Hecho con RB Suite</p>
      </footer>
    </div>
  )
}
