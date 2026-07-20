// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxtjs/i18n'
  ],

  css: ['~/assets/css/main.css'],

  // Keep component names stable while organizing files by responsibility.
  // For example, `components/ui/GlassCard.vue` remains available as
  // `<GlassCard>` instead of `<UiGlassCard>`.
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    fallbackLocale: 'en',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'lo', language: 'lo-LA', name: 'ລາວ', file: 'lo.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'gardenos_lang',
      redirectOn: 'root'
    }
  },

  // GardenOS is dark-first but fully supports a light theme.
  // @nuxtjs/color-mode (registered by @nuxt/ui) toggles `.dark`/`.light` on <html>.
  colorMode: {
    preference: 'system',
    fallback: 'dark',
    classSuffix: ''
  },

  app: {
    head: {
      title: 'GardenOS — Farm & Garden Management',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Decentralized, offline-capable farm & garden management built on Nostr.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap'
        }
      ]
    }
  }
})
