<template>
  <v-card>
    <v-toolbar
      color="secondary"
      dark
      flat
      dense
    >
      <v-toolbar-title> {{ t('report.title') }} </v-toolbar-title>
      <v-spacer />
      <ReportReloadButton
        :loading="loading"
        @get-reports="getReports()"
      />
    </v-toolbar>
    <v-row
      v-if="loading"
      align="center"
      justify="center"
      class="ma-2"
    >
      <Loader />
    </v-row>
    <NoData
      v-else-if="reports.length === 0"
      :text="t('report.noReport')"
    />
    <ReportDataTable
      v-else
      :reports="reports"
    />
  </v-card>
</template>

<script setup>

/* eslint-disable no-await-in-loop */

const { t } = useI18n();
const snackStore = useSnacksStore();
const { $fetch } = useNuxtApp();

const loading = ref(false);
const reports = ref([]);

async function getReports() {
  loading.value = true;
  let res;

  try {
    res = await $fetch('/reports', {
      method: 'GET',
    });
  } catch (err) {
    snackStore.error(t('error.report.get'));
    loading.value = false;
    return;
  }

  reports.value = res;

  loading.value = false;
}

onMounted(() => {
  getReports();
});

</script>
