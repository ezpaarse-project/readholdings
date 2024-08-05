<template>
  <v-list>
    <v-list-item v-for="route in routers" link router :to="{ path: route.path }" ripple :title="route.text">
      <template v-slot:prepend>
        <v-icon :icon="route.icon" />
      </template>
    </v-list-item>
    <v-list-item link router to="/administration/elastic" ripple>
      <template v-slot:prepend>
        <v-avatar rounded="0">
          <img src="/static/images/elastic.png" alt="Elastic Logo" style="max-width: 30px; max-height: 30px; width: auto; height: auto;">
        </v-avatar>
      </template>
      <v-list-item-title class=" ml-2">Elastic</v-list-item-title>
    </v-list-item>
    <v-list-item link router :href="runtimeConfig.public.kibanaURL" target="_blank" ripple>
      <template v-slot:prepend>
        <v-avatar rounded="0">
          <img src="/static/images/kibana.png" alt="Kibana Logo" style="max-width: 30px; max-height: 30px; width: auto; height: auto;">
        </v-avatar>
      </template>
      <v-list-item-title class=" ml-2">Kibana</v-list-item-title>
    </v-list-item>
    <v-list-item class="bg-red-lighten-4" ripple :title="t('administration.logout')" @click="logOut()">
      <template v-slot:prepend>
        <v-icon icon="mdi-logout" />
      </template>
    </v-list-item>
  </v-list>
</template>

<script setup>

const runtimeConfig = useRuntimeConfig()
const adminStore = useAdminStore();

const router = useRouter()

const { t } = useI18n()

const routers = computed(() => [
  { text: 'HLM', icon: 'mdi-upload', path: '/administration/hlm', },
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
