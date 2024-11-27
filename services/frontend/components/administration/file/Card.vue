<template>
  <v-card>
    <v-toolbar color="secondary" dark flat dense>
      <v-toolbar-title>
        {{ t('administration.file.title') }}
      </v-toolbar-title>
      <v-btn icon="mdi-reload" :disabled="loading" @click.stop="getFiles()" />
    </v-toolbar>
    <v-list v-if="files.length > 0">
      <v-list-item v-for="filename in files" :key="filename">
        {{ filename }}
        <template #append>
          <v-btn icon="mdi-delete" variant="text" @click.stop="openDeleteDialog(filename)" />
        </template>
      </v-list-item>
    </v-list>
    <NoData v-else :text="t('noData')" />
  </v-card>
</template>

<script setup>

const { t } = useI18n();
const snackStore = useSnacksStore();
const adminStore = useAdminStore();
const { $fetch } = useNuxtApp();
const { openConfirm } = useDialogStore();

const { password } = storeToRefs(adminStore);

const loading = ref(false);
const files = ref([]);

/**
 * Get files
 */
async function getFiles() {
  loading.value = true;
  let res;

  try {
    res = await $fetch('/files', {
      method: 'GET',
      headers: {
        'X-API-KEY': password.value,
      },
    });
  } catch (err) {
    snackStore.error(t('error.file.get'));
    return;
  }

  loading.value = false;
  files.value = res;
}

/**
 * Delete file.
 *
 * @param filename filename.
 */
async function deleteFile(filename) {
  try {
    await $fetch(`/files/${filename}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': password.value,
      },
    });
  } catch (err) {
    console.log(err);
    snackStore.error(t('error.file.delete'));
    return;
  }
  snackStore.success(t('info.file.deleted'));
}

/**
 * Open dialog to delete filename.
 *
 * @param filename Filename.
 */
async function openDeleteDialog(filename) {
  openConfirm({
    title: t('administration.file.delete'),
    text: t('administration.file.deleteMessage', { filename }),
    agreeText: t('delete'),
    agreeIcon: 'mdi-delete',
    onAgree: async () => {
      await deleteFile(filename);
      await getFiles();
    },
  });
}

onMounted(async () => {
  await getFiles();
});

</script>
