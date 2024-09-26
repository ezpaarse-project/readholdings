<template>
  <v-list>
    <v-list-item link router :to="{ path: '/administration/holdingsIQ' }" ripple :title="t('administration.menu.holdingsIQ')">
      <template #prepend>
        <v-icon icon="mdi-database-refresh" />
      </template>
    </v-list-item>

    <v-list-item link router :to="{ path: '/administration/health' }" ripple :title="t('administration.menu.health')">
      <template #prepend>
        <v-icon icon="mdi-heart-pulse" />
      </template>
    </v-list-item>

    <v-list-item link router to="/administration/elastic" ripple>
      <template #prepend>
        <v-avatar rounded="0">
          <img src="/static/images/elastic.png" alt="Elastic Logo" style="max-width: 30px; max-height: 30px; width: auto; height: auto;">
        </v-avatar>
      </template>
      <v-list-item-title class=" ml-2">
        Elastic
      </v-list-item-title>
    </v-list-item>

    <v-list-item link router :href="runtimeConfig.public.kibanaURL" target="_blank" rel="noopener noreferrer" ripple>
      <template #prepend>
        <v-avatar rounded="0">
          <img src="/static/images/kibana.png" alt="Kibana Logo" style="max-width: 30px; max-height: 30px; width: auto; height: auto;">
        </v-avatar>
      </template>
      <v-list-item-title class=" ml-2">
        Kibana
      </v-list-item-title>
    </v-list-item>

    <v-list-item link router :to="{ path: '/administration/hlm' }" ripple title="HLM">
      <template #prepend>
        <v-icon icon="mdi-upload" />
      </template>
    </v-list-item>

    <v-list-group value="Lang">
      <template #activator="{ props }">
        <v-list-item v-bind="props" title="config">
          <template #prepend>
            <v-icon icon="mdi-code-json" />
          </template>
        </v-list-item>
      </template>
      <SkeletonMenuAdminConfigList />
    </v-list-group>

    <v-list-item class="bg-red-lighten-4" ripple :title="t('administration.logout')" @click="logout()">
      <template #prepend>
        <v-icon icon="mdi-logout" />
      </template>
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
