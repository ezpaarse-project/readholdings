import { defineNuxtPlugin, useI18n } from '#imports';
import { createVuetify } from 'vuetify';

import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import { fr, en } from 'vuetify/locale';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import colors from 'vuetify/util/colors';

const I18N_KEY = '__VUE_I18N__';

export default defineNuxtPlugin(nuxtApp => {
  const i18n = nuxtApp.vueApp[I18N_KEY];
  i18n.global.mergeLocaleMessage('en', { $vuetify: en });
  i18n.global.mergeLocaleMessage('fr', { $vuetify: fr });

  nuxtApp.vueApp.use(
    createVuetify({
      ssr: true,
        components,
        directives,
        locale: {
          adapter: createVueI18nAdapter({
            i18n,
            useI18n,
          }),
        },
        theme: {
          themes: {
            light: {
              colors: {
                primary: colors.blue.darken1,
                secondary: colors.grey.darken4,
                secondary: colors.grey.darken4,
              }
            },
            dark: {
              colors: {
                primary: colors.blue.darken1,
                accent: colors.grey.darken3,
                secondary: colors.grey.darken3,
              }
            }
          }
        }
    })
  );
})