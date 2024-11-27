<template>
  <v-list>
    <v-list-item link router :to="{ path: '/administration/holdingsIQ' }" ripple>
      <template #prepend>
        <v-icon icon="mdi-database-refresh" />
      </template>
      <v-list-item-title class="custom-font-style">
        holdingsIQ
      </v-list-item-title>
    </v-list-item>

    <v-list-item link router :to="{ path: '/administration/health' }" ripple>
      <template #prepend>
        <v-icon icon="mdi-heart-pulse" />
      </template>
      <v-list-item-title class="custom-font-style">
        {{ t('administration.menu.health') }}
      </v-list-item-title>
    </v-list-item>

    <v-list-item link router :to="{ path: '/administration/file' }" ripple>
      <template #prepend>
        <v-icon icon="mdi-file" />
      </template>
      <v-list-item-title class="custom-font-style">
        {{ t('administration.menu.file') }}
      </v-list-item-title>
    </v-list-item>

    <v-list-item link router to="/administration/elastic" ripple>
      <template #prepend>
        <v-avatar rounded="0">
          <img src="/static/images/elastic.png" alt="Elastic Logo" style="max-width: 30px; max-height: 30px; width: auto; height: auto;">
        </v-avatar>
      </template>
      <v-list-item-title class="custom-font-style ml-2">
        Elastic
      </v-list-item-title>
    </v-list-item>

    <v-list-item link router :href="runtimeConfig.public.kibanaURL" target="_blank" rel="noopener noreferrer" ripple>
      <template #prepend>
        <v-avatar rounded="0">
          <img src="/static/images/kibana.png" alt="Kibana Logo" style="max-width: 30px; max-height: 30px; width: auto; height: auto;">
        </v-avatar>
      </template>
      <v-list-item-title class="custom-font-style ml-2">
        Kibana
      </v-list-item-title>
    </v-list-item>

    <v-list-item link router :to="{ path: '/administration/hlm' }" ripple>
      <template #prepend>
        <v-icon icon="mdi-upload" />
      </template>
      <v-list-item-title class="custom-font-style">
        HLM
      </v-list-item-title>
    </v-list-item>

    <v-list-item link router :to="{ path: '/administration/config' }" ripple>
      <template #prepend>
        <v-icon icon="mdi-code-json" />
      </template>
      <v-list-item-title class="custom-font-style">
        Config
      </v-list-item-title>
    </v-list-item>

    <v-list-item class="bg-red-lighten-4" ripple @click="logout()">
      <template #prepend>
        <v-icon icon="mdi-logout" />
      </template>
      <v-list-item-title class="custom-font-style">
        {{ t('administration.logout') }}
      </v-list-item-title>
    </v-list-item>
  </v-list>
</template>

<script setup>

const runtimeConfig = useRuntimeConfig();
const adminStore = useAdminStore();

const router = useRouter();

const { t } = useI18n();

/**
 * Disconnect admin user and move him to administration.
 */
function logout() {
  adminStore.setIsAdmin(false);
  adminStore.setPassword('');

  router.push('/administration');
}

</script>

<style>
.custom-font-style {
  font-size: 0.8125em;
  font-weight: 500;
}
</style>
