import { fileURLToPath } from 'node:url'

const googleFontsUrl =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-28',

  /**
   * Lumia Admin es una herramienta interna sin SEO: se sirve como SPA.
   * Evita renderizar datos privados en el servidor y simplifica el manejo de la sesión
   * (las cookies de sesión solo viajan entre el navegador y el BFF Nitro).
   */
  ssr: false,

  devtools: { enabled: process.env.NODE_ENV === 'development' },

  css: ['~/assets/css/main.css'],

  alias: {
    '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  typescript: {
    strict: true,
  },

  components: [
    { path: '~/components', pathPrefix: false },
    { path: '~/features/auth/components', pathPrefix: false },
    { path: '~/features/dashboard/components', pathPrefix: false },
    { path: '~/features/categories/components', pathPrefix: false },
    { path: '~/features/products/components', pathPrefix: false },
    { path: '~/features/inventory/components', pathPrefix: false },
    { path: '~/features/orders/components', pathPrefix: false },
    { path: '~/features/promotions/components', pathPrefix: false },
    { path: '~/features/banners/components', pathPrefix: false },
    { path: '~/features/settings/components', pathPrefix: false },
    { path: '~/features/roles/components', pathPrefix: false },
    { path: '~/features/audit/components', pathPrefix: false },
    { path: '~/features/analytics/components', pathPrefix: false },
    { path: '~/features/images/components', pathPrefix: false },
    { path: '~/features/production/components', pathPrefix: false },
    { path: '~/features/lumi/components', pathPrefix: false },
  ],

  imports: {
    dirs: ['composables', 'features/**/composables'],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'es-CO' },
      title: 'Lumia Admin',
      meta: [
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'referrer', content: 'same-origin' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: googleFontsUrl },
      ],
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
        'Content-Security-Policy': "frame-ancestors 'none'",
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
    '/api/**': {
      headers: { 'Cache-Control': 'no-store' },
    },
  },

  runtimeConfig: {
    /**
     * Solo servidor (BFF). Nunca exponer en `public`.
     * URL del Server Fastify, ej. http://server-api:3001 (Docker) o http://127.0.0.1:3001 (host).
     */
    apiBaseUrl: '',
    /** Timeout de cada llamada al Server (ms). */
    apiTimeoutMs: 15000,
    /** Nombres de las cookies que emite el Server (COOKIE_ACCESS_NAME / COOKIE_REFRESH_NAME). */
    serverAccessCookieName: 'lumia_access',
    serverRefreshCookieName: 'lumia_refresh',
    /**
     * Atributo Secure de las cookies propias de Lumia Admin.
     * true por defecto; los navegadores lo aceptan en http://localhost.
     */
    sessionCookieSecure: true,
    /**
     * Orígenes permitidos para peticiones que modifican estado (separados por coma).
     * Vacío = solo el mismo origen que sirve la aplicación.
     */
    allowedOrigins: '',

    public: {
      storeCurrency: 'COP',
      storeLocale: 'es-CO',
      storeTimezone: 'America/Bogota',
    },
  },
})
