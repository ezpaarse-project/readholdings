<template>
  <v-card :loading="status === 'pending' && 'primary'">
    <v-card-title class="d-flex align-center bg-secondary">
      {{ $t('administration.extraction.title') }}

      <v-spacer />

      <v-btn
        :disabled="status === 'pending'"
        icon="mdi-reload"
        variant="text"
        @click="refresh()"
      />
    </v-card-title>

    <v-card-text v-if="data" class="mt-2">
      <AdministrationExtractionStatusRow
        :state="data.state"
        :is-watching="isWatching"
        @update:state="refresh()"
      />

      <v-divider class="my-2" />

      <AdministrationExtractionFormRow
        :state="data.state"
        @update:state="refresh()"
      />

      <v-divider class="my-2" />

      <AdministrationExtractionFilesRow
        :state="data.state"
        :files="data.files"
        @update:files="refresh()"
      />
    </v-card-text>
  </v-card>
</template>

<script setup>
const { t } = useI18n();
const { $fetch } = useNuxtApp();
const snackStore = useSnacksStore();

const { password } = storeToRefs(useAdminStore());
const isWatching = shallowRef(false);

const {
  data,
  status,
  refresh,
} = await useFetch('/extract', {
  method: 'GET',
  headers: {
    'X-API-KEY': password.value,
  },
  lazy: true,
  // Catch error and prints it in a snack
  $fetch: async (...params) => {
    try {
      return await $fetch(...params);
    } catch (err) {
      console.error(err);
      snackStore.error(t('error.extraction.status'));
      throw err;
    }
  },
});

/**
 * Polling state when extraction is running
 */
let intervalId;
watch(data, () => {
  if (!data.value) {
    return;
  }

  if (data.value.state.status === 'running' && !intervalId) {
    isWatching.value = true; // will allow to show "success" instead of "idle"
    intervalId = setInterval(() => refresh(), 1000);
  }

  if (data.value.state.status !== 'running' && intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
}, { immediate: true });
</script>
