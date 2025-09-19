<template>
  <v-list-item
    v-for="lang in langs"
    :key="lang.locale"
    :title="lang.language"
    @click="setLocale(lang.locale)"
  >
    <template #prepend>
      <v-avatar
        :image="lang.pathImage"
        size="32"
        rounded="0"
        start
      />
    </template>
  </v-list-item>
</template>

<script setup>
import frFlag from '@/static/images/lang/fr.png';
import enFlag from '@/static/images/lang/en.png';

const { setLocale } = useI18n();

const langs = computed(() => [
  {
    locale: 'fr',
    pathImage: frFlag,
    language: 'Français',
  },
  {
    locale: 'en',
    pathImage: enFlag,
    language: 'English',
  },
]);
</script>
