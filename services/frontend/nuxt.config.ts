// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: {
        lang: 'fr',
      },
      title: 'ReadHoldings',
      charset: 'utf-8',
      meta: [],
      link: [],
    },
  },

  runtimeConfig: {
    public: {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.VERSION || 'development',
      gitHubRepoURL: process.env.GITHUB_REPO || 'https://github.com/ezpaarse-project/readholdings',
      APIURL: process.env.API_URL || 'http://localhost:59701',
      kibanaURL: process.env.KIBANA_URL || 'http://localhost:5601',
    },
  },

  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/i18n'],

  build: {
    transpile: ['vuetify'],
  },

  i18n: {
    vueI18n: './config/i18n.js',
  },

  pinia: {
    storesDirs: ['./store/**'],
  },

  plugins: [
    '~/plugins/vuetify',
    '~/plugins/fetch',
    '~/plugins/highlight.client',
  ],

  css: [
    'vuetify/lib/styles/main.sass',
    '@mdi/font/css/materialdesignicons.min.css',
  ],

  compatibilityDate: '2024-07-15',
});
