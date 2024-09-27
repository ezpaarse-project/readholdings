import locales from './locales';

/**
 * @type {import('@nuxt/schema').NuxtConfig['i18n']}
 */
export default {
  lazy: true,
  strategy: 'no_prefix',
  defaultLocale: 'fr',
  langDir: 'locales',
  locales,
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: 'ezunpaywall_i18n',
  },
};
