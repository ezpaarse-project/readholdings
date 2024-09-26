<template>
  <v-card>
    <v-toolbar color="secondary" dark flat dense>
      <v-toolbar-title>
        {{ t('administration.holdingsIQ.title') }}
      </v-toolbar-title>
      <v-spacer />
      <AdministrationHoldingsIQReloadButton :loading="loading" @get-state="updateState()" />
    </v-toolbar>
    <v-card-actions class="d-flex justify-center">
      <AdministrationHoldingsIQStartButton :status="status" />
    </v-card-actions>

    <v-card-text>
      <AdministrationHoldingsIQState ref="stateRef" :status="status" />
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
