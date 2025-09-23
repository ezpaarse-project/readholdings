<template>
  <v-list-item
    title="holdingsIQ"
    prepend-icon="mdi-database-refresh"
    to="/administration/holdingsIQ"
  />

  <v-list-item
    :title="$t('administration.menu.health')"
    prepend-icon="mdi-heart-pulse"
    to="/administration/health"
  />

  <v-list-item
    :title="$t('administration.menu.file')"
    prepend-icon="mdi-file"
    to="/administration/file"
  />

  <v-list-item
    title="Elastic"
    to="/administration/elastic"
  >
    <template #prepend>
      <v-avatar
        image="/static/images/elastic.png"
        size="32"
        rounded="0"
        start
      />
    </template>
  </v-list-item>

  <v-list-item
    title="Kibana"
    :href="runtimeConfig.public.kibanaURL"
  >
    <template #prepend>
      <v-avatar
        image="/static/images/kibana.png"
        size="32"
        rounded="0"
        start
      />
    </template>
  </v-list-item>

  <!-- <v-list-item
    title="HLM"
    prepend-icon="mdi-upload"
    to="/administration/hlm"
  /> -->

  <v-list-item
    :title="$t('administration.extraction.title')"
    prepend-icon="mdi-download"
    to="/administration/extraction"
  />

  <v-list-item
    title="Config"
    prepend-icon="mdi-code-json"
    to="/administration/config"
  />

  <v-list-item
    :title="$t('administration.logout')"
    prepend-icon="mdi-logout"
    class="bg-red-lighten-4"
    @click="logout()"
  />
</template>

<script setup>

const runtimeConfig = useRuntimeConfig();
const adminStore = useAdminStore();

const router = useRouter();

/**
 * Disconnect admin user and move him to administration.
 */
function logout() {
  adminStore.setIsAdmin(false);
  adminStore.setPassword('');

  router.push('/administration');
}

</script>
