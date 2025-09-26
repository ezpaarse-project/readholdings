<template>
  <v-card :loading="loading && 'primary'">
    <v-card-title class="d-flex align-center bg-secondary">
      {{ t('administration.holdingsIQ.title') }}
      <v-spacer />

      <AdministrationHoldingsIQStartButton
        :status="status"
        class="mr-4"
      />

      <AdministrationHoldingsIQReloadButton
        :loading="loading"
        @get-state="updateState()"
      />
    </v-card-title>

    <v-card-text class="mt-2">
      <AdministrationHoldingsIQState
        ref="stateRef"
        :status="status"
      />
    </v-card-text>
  </v-card>
</template>

<script setup>

const { t } = useI18n();
const snackStore = useSnacksStore();

const { $fetch } = useNuxtApp();

const loading = ref(false);
const status = ref(false);
let intervalId = null;

const stateRef = ref(null);

async function getStatus() {
  loading.value = true;

  let res;

  try {
    res = await $fetch('/status', {
      method: 'GET',
    });
  } catch (err) {
    snackStore.error(t('error.status.get'));
    loading.value = false;
    return;
  }

  status.value = res;
  loading.value = false;
}

function updateState() {
  if (stateRef.value) {
    stateRef.value.getState();
  }
}

onBeforeUnmount(() => {
  clearInterval(intervalId);
});

onMounted(async () => {
  intervalId = setInterval(async () => { await getStatus(); }, 2000);
});

</script>
