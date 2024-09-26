<template>
  <v-list nav dense>
    <v-list-item v-for="route in routers" link router :to="{ path: route.path }" ripple :title="route.text">
      <template #prepend>
        <v-icon :icon="route.icon" />
      </template>
    </v-list-item>

    <v-list-item link router :to="{ path: '/report' }" ripple :title="t('menu.report')">
      <template #prepend>
        <v-icon icon="mdi-list-status" />
      </template>
    </v-list-item>
  </v-list>
</template>

<script setup>

const { t } = useI18n();

const routers = computed(() => [
  { text: t('menu.home'), icon: 'mdi-view-dashboard', path: '/' },
]);

</script>
