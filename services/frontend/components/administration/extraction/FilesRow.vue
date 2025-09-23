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
          prepend-icon="mdi-download"
          @click="downloadFile(file)"
        >
          <template #append>
            <v-btn
              :disabled="state.status === 'running'"
              density="comfortable"
              variant="text"
              icon="mdi-delete"
              color="red"
              class="ml-1"
              @click="deleteFile(file)"
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

async function downloadFile(file) {

}

async function deleteFile({ filename }) {
  try {
    await $fetch(`/extract/files/${filename}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': password.value,
      },
    });

    const newFiles = props.files.filter((f) => f.filename !== filename);
    emit('update:files', newFiles);
  } catch (err) {
    snackStore.error(t('error.extraction.unableToDeleteFile'));
  }
}
</script>
