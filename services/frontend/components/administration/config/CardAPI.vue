<template>
  <v-card>
    <v-toolbar
      color="secondary"
      dark
      flat
      dense
    >
      <v-toolbar-title>
        {{ t("administration.config.api") }}
      </v-toolbar-title>
    </v-toolbar>
    <JSONView :code="APIconfig" />
  </v-card>
</template>

<script setup>

const adminStore = useAdminStore();
const { password } = storeToRefs(adminStore);

const { $fetch } = useNuxtApp();

const { t } = useI18n();

const loading = ref(false);
const APIconfig = ref('');

/**
 * Get config of readholdingsv API
 */
async function getAPIConfig() {
  let appConfig;
  loading.value = true;
  try {
    appConfig = await $fetch('/config', {
      method: 'GET',
      headers: {
        'x-api-key': password.value,
      },
    });
  } catch (err) {
    loading.value = false;
    return;
  }

  loading.value = false;

  const stringifiedConfig = JSON.stringify(appConfig, null, 2);
  APIconfig.value = stringifiedConfig;
}

onMounted(() => {
  getAPIConfig();
});

</script>
