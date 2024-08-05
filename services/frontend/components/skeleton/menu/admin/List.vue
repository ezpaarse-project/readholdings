<template>
  <v-list>
    <v-list-item v-for="route in routers" link router :to="{ path: route.path }" ripple :title="route.text">
      <template v-slot:prepend>
        <v-icon :icon="route.icon" />
      </template>
    </v-list-item>
    <v-list-item class="bg-red-lighten-4" ripple :title="t('administration.logout')" @click="logOut()">
      <template v-slot:prepend>
        <v-icon icon="mdi-logout" />
      </template>
    </v-list-item>
  </v-list>
</template>
  
<script setup>

const adminStore = useAdminStore();

const router = useRouter()

const { t } = useI18n()

const routers = computed(() => [
  { text: t('administration.menu.hlm'), icon: 'mdi-upload', path: '/administration/elastic', },
  { text: t('administration.menu.health'), icon: 'mdi-heart-pulse', path: '/administration/health', },
  // { text: t('administration.menu.cron'), icon: 'mdi-update', path: '/administration/cron', },
  { text: t('administration.menu.config'), icon: 'mdi-code-json', path: '/administration/config', }
]);

function logOut() {
  adminStore.setIsAdmin(false);
  adminStore.setPassword('');

  router.push('/administration')
}

</script>
  