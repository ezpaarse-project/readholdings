import { fr, enGB } from 'date-fns/locale';

import { useI18n, computed } from '#imports';

const availableLocales = { fr, en: enGB };

export default function useDateLocale() {
  const { locale } = useI18n();

  return {
    locale: computed(() => availableLocales[locale.value]),
  };
}
