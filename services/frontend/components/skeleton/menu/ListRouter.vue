<template>
  <v-list-item
    v-for="route in routers"
    :key="route.path"
    :title="route.text"
    :to="route.path"
    :prepend-icon="route.icon"
  />

  <v-list-item
    :title="$t('menu.report')"
    to="/report"
    prepend-icon="mdi-list-status"
  />
</template>

<script setup>
const { t } = useI18n();

const routers = computed(() => [
  { text: t('menu.home'), icon: 'mdi-view-dashboard', path: '/' },
  { text: 'openAPI', icon: 'mdi-api', path: '/open-api' },
]);
</script>
