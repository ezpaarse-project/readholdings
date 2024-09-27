<template>
  <v-btn
    :loading="loading"
    :disabled="props.dataToImport.length === 0"
    @click.stop="importInElastic()"
  >
    {{ t("import") }}
  </v-btn>
</template>

<script setup>

const props = defineProps({
  dataToImport: { type: Array, default: () => [] },
});

const emit = defineEmits(['import']);

const { t } = useI18n();
const snackStore = useSnacksStore();
const adminStore = useAdminStore();
const { $fetch } = useNuxtApp();

const { password } = storeToRefs(adminStore);

const loading = ref(false);

async function importInElastic() {
  loading.value = true;

  const formData = new FormData();

  props.dataToImport.forEach((data, index) => {
    formData.append(`file-${index}`, data.file);
    formData.append(`portal-${index}`, data.portal);
  });

  try {
    await $fetch('/hlm/import', {
      method: 'POST',
      body: formData,
      headers: {
        'x-api-key': password.value,
      },
    });
  } catch (err) {
    snackStore.error(t('error.hlm.import'));
    loading.value = false;
    return;
  }

  loading.value = false;
  snackStore.success(t('info.hlm.imported'));

  emit('import');
}

</script>
