/* eslint-disable import/no-unresolved */
import colors from 'vuetify/util/colors';

/**
 * @type {import('vuetify-nuxt-module').ModuleOptions}
 */
export default {
  vuetifyOptions: {
    ssr: true,

    directives: true,

    theme: {
      themes: {
        light: {
          colors: {
            primary: colors.blue.darken1,
            secondary: colors.grey.darken4,
          },
        },
        dark: {
          colors: {
            primary: colors.blue.darken1,
            accent: colors.grey.darken3,
            secondary: colors.grey.darken3,
          },
        },
      },
    },
  },
};
