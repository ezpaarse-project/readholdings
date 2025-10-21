<template>
  <v-row>
    <v-col>
      <h4 class="mb-2">
        {{ $t('administration.extraction.files.title') }}
      </h4>

      <v-list v-if="files.length > 0">
        <v-list-item
          v-for="file in files"
          :key="file.filename"
          :title="file.filename"
          :subtitle="pretty(file.stat.size, { locale })"
          :disabled="state.filename === file.filename"
          @click="downloadFile(file)"
        >
          <template #prepend>
            <v-icon v-if="state.filename === file.filename" icon="mdi-dots-horizontal" />

            <v-badge
              v-else-if="!loadingMap.get(file.filename)"
              :model-value="newFiles.has(file.filename)"
              color="primary"
              floating
              dot
            >
              <v-icon icon="mdi-download" />
            </v-badge>

            <v-progress-circular
              v-else
              color="primary"
              width="2"
              size="21"
              indeterminate
              class="mr-8"
            />
          </template>

          <template #append>
            <v-btn
              :disabled="state.progress.percent !== 1 && state.filename === file.filename"
              density="comfortable"
              variant="text"
              icon="mdi-delete"
              color="red"
              class="ml-1"
              @click.stop="deleteFile(file)"
            />
          </template>
        </v-list-item>
      </v-list>

      <v-empty-state
        v-else
        :title="$t('administration.extraction.files.noExtraction.title')"
        :text="$t('administration.extraction.files.noExtraction.description')"
        icon="mdi-folder-hidden"
      />
    </v-col>
  </v-row>
</template>

<script setup>
import pretty from 'pretty-bytes';

const props = defineProps({
  state: {
    type: Object,
    required: true,
  },
  files: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits({
  'update:files': (v) => !!v,
});

const { t, locale } = useI18n();
const { $fetch } = useNuxtApp();
const snackStore = useSnacksStore();

const { password } = storeToRefs(useAdminStore());

const originalFilenames = ref(new Set(props.files.map((file) => file.filename)));
const loadingMap = ref(new Map());

const newFiles = computed(() => {
  const filenames = new Set(props.files.map((file) => file.filename));
  return filenames.difference(originalFilenames.value);
});

async function downloadFile({ filename }) {
  loadingMap.value.set(filename, true);
  try {
    const blob = await $fetch(`/extract/files/${filename}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': password.value,
      },
      responseType: 'blob',
    });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.target = '_blank';
    link.download = filename;

    link.click(); // Click is synchronous
    URL.revokeObjectURL(link.href);
    originalFilenames.value.add(filename);
  } catch (err) {
    snackStore.error(t('error.extraction.file.get', { err: err.message }));
  }
  loadingMap.value.set(filename, false);
}

async function deleteFile({ filename }) {
  try {
    await $fetch(`/extract/files/${filename}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': password.value,
      },
    });

    const updatedFiles = props.files.filter((f) => f.filename !== filename);
    emit('update:files', updatedFiles);
  } catch (err) {
    snackStore.error(t('error.extraction.file.delete', { err: err.message }));
  }
}
</script>
