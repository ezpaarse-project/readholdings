import { defineNuxtConfig } from 'nuxt/config';

import i18nOptions from './app/i18n.options';
import vuetifyOptions from './app/vuetify.options';

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
  modules: [
    'vuetify-nuxt-module',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
  ],

  build: {
    transpile: ['vuetify'],
  },

  i18n: i18nOptions,

  vuetify: vuetifyOptions,

  pinia: {
    storesDirs: ['./store/**'],
  },

  plugins: [
    '~/plugins/fetch',
    '~/plugins/highlight.client',
  ],

  css: [
    'vuetify/lib/styles/main.sass',
    '@mdi/font/css/materialdesignicons.min.css',
  ],

  compatibilityDate: '2024-07-15',
});
