<template>
  <v-card>
    <v-toolbar
      color="secondary"
      dark
      flat
      dense
    >
      <v-toolbar-title>
        {{ t("administration.config.title") }}
      </v-toolbar-title>
    </v-toolbar>
    <JSONView :code="config"/>
  </v-card>
</template>

<script setup>

const adminStore = useAdminStore();
const { password } = storeToRefs(adminStore);

const { $fetch } = useNuxtApp();

const { t } = useI18n();

const loading = ref(false);
const config = ref("");

async function getConfig() {
  let appConfig;
  loading.value = true;
  try {
    appConfig = await $fetch('/config', {
      method: 'GET',
      headers: {
        'x-api-key': password.value
      }
    });
  } catch (err) {
    loading.value = false;
    return;
  }

  loading.value = false;

  console.log(appConfig)

  const stringifiedConfig = JSON.stringify(appConfig, null, 2);
  config.value = stringifiedConfig
}

onMounted(() => {
  getConfig();
});

</script>