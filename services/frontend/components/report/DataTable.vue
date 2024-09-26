<template>
  <div>
    <v-data-table
      :headers="tableHeaders"
      :items="props.reports"
      :items-per-page="7"
      :loading="props.loading"
      item-key="createdAt"
      class="elevation-1"
    >
      <template
        #[`item.createdAt`]="{ item }"
      >
        {{ item?.report?.createdAt }}
      </template>
      <template #[`item.error`]="{ item }">
        <v-icon
          v-if="!item?.report?.error"
          right
          color="green"
        >
          mdi-check
        </v-icon>
        <v-icon
          v-else
          right
          color="red"
        >
          mdi-close
        </v-icon>
      </template>
      <template
        #[`item.indices`]="{ item }"
      >
        {{ item?.report?.index }}
      </template>

      <template
        #[`item.documents`]="{ item }"
      >
        {{ item?.report?.documents }}
      </template>

      <template #[`item.details`]="{ item }">
        <v-btn
          icon="mdi-code-json"
          x-small
          @click="showDetails(item)"
        />
      </template>
    </v-data-table>
    <ReportDetailDialog
      v-model="dialogVisible"
      :report="reportSelected"
      @closed="setDialogVisible(false)"
    />
  </div>
</template>

<script setup>

const { t } = useI18n();

const props = defineProps({
  reports: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

const dialogVisible = ref(false);
const reportSelected = ref({});

const tableHeaders = computed(() => [
  {
    title: 'Date',
    align: 'start',
    sortable: false,
    key: 'createdAt',
  },
  {
    title: t('report.status'),
    align: 'start',
    sortable: false,
    key: 'error',
  },
  {
    title: 'Index',
    key: 'indices',
    align: 'start',
    sortable: false,
  },
  {
    title: 'Documents',
    key: 'documents',
    align: 'start',
    sortable: false,
  },
  {
    title: t('detail'),
    key: 'details',
    align: 'end',
    sortable: false,
  },
]);

function showDetails(item) {
  reportSelected.value = item;
  dialogVisible.value = true;
}

</script>
