<template>
  <v-form
    v-model="isValid"
    :disabled="state.status === 'running'"
    class="mt-4"
    @submit.prevent="startGeneration()"
  >
    <v-row>
      <v-col cols="12">
        <h4>
          {{ $t('administration.extraction.form.title') }}
        </h4>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="6">
        <v-select
          v-model="index"
          :label="$t('administration.extraction.form.index')"
          :items="indexItems"
          :loading="indicesStatus === 'pending' && 'primary'"
          :rules="[(v) => !!v || $t('required')]"
          prepend-icon="mdi-database"
          variant="underlined"
        />
      </v-col>

      <v-col cols="6">
        <v-autocomplete
          v-model="fields"
          :label="$t('administration.extraction.form.fields')"
          :items="[]"
          :loading="false"
          :rules="[(v) => !!v || $t('required')]"
          prepend-icon="mdi-format-list-bulleted"
          variant="underlined"
          multiple
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-field
          :label="$t('administration.extraction.filters.title', filters.length)"
          prepend-inner-icon="mdi-filter"
          variant="plain"
          class="mb-2"
        />

        <AdministrationExtractionFiltersForm v-model="filters" />
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
          v-model="name"
          :label="$t('administration.extraction.form.name')"
          prepend-icon="mdi-form-textbox"
          variant="underlined"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="4">
        <v-text-field
          v-model="delimiter"
          :label="$t('administration.extraction.form.delimiter')"
          :rules="[(v) => !!v || $t('required')]"
          prepend-icon="mdi-slash-forward"
          variant="underlined"
        />
      </v-col>

      <v-col cols="4">
        <v-text-field
          v-model="escape"
          :label="$t('administration.extraction.form.escape')"
          :rules="[(v) => !!v || $t('required')]"
          prepend-icon="mdi-format-quote-close"
          variant="underlined"
        />
      </v-col>

      <v-col cols="4">
        <v-select
          v-model="encoding"
          :label="$t('administration.extraction.form.encoding')"
          :rules="[(v) => !!v || $t('required')]"
          :items="ENCODINGS"
          prepend-icon="mdi-file-settings"
          variant="underlined"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" class="d-flex justify-end">
        <v-btn
          :text="$t('administration.extraction.form.start')"
          :loading="startLoading"
          :disabled="!isValid"
          prepend-icon="mdi-play"
          color="primary"
          type="submit"
        />
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup>
const props = defineProps({
  state: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits({
  'update:state': (v) => !!v,
});

// Extraction of BufferEncoding (minus duplicates or out of scopes)
const ENCODINGS = [
  'ASCII',
  'UTF-8',
  'UTF-16LE',
  'UCS-2',
  // 'BASE64',
  // 'BASE64URL',
  'LATIN1',
  // 'BINARY',
  // 'HEX',
];

const { t } = useI18n();
const { $fetch } = useNuxtApp();
const snackStore = useSnacksStore();

const { password } = storeToRefs(useAdminStore());

const isValid = shallowRef(false);
const startLoading = shallowRef(false);

const index = shallowRef('');
const fields = ref([]);
const filters = ref([]);
const name = shallowRef('');
const delimiter = shallowRef(';');
const escape = shallowRef('"');
const encoding = shallowRef('UTF-8');

const {
  data: indices,
  status: indicesStatus,
  // refresh: indicesRefresh,
} = await useFetch('/elastic/indices', {
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
      snackStore.error(t('error.extraction.status'));
      throw err;
    }
  },
});

const indexItems = computed(() => {
  if (!indices.value) {
    return [];
  }

  return indices.value.map((item) => ({
    value: item.uuid,
    title: item.index,
    props: {
      subtitle: item['store.size'],
    },
  }));
});

async function startGeneration() {
  if (props.state.status === 'running' || !isValid.value) {
    return;
  }

  startLoading.value = true;
  try {
    const newState = await $fetch('/extract/_start', {
      method: 'POST',
      headers: {
        'X-API-KEY': password.value,
      },
      body: {
        name: name.value,
        encoding: encoding.value.toLowerCase(),

        index: index.value,
        fields: fields.value,
        filters: filters.value,

        delimiter: delimiter.value,
        escape: escape.value,
      },
    });

    emit('update:state', newState);
  } catch (err) {
    snackStore.error(t('error.extraction.unableToStart'));
  }
  startLoading.value = false;
}

watch(indexItems, () => {
  if (!indexItems.value || indexItems.value.length < 0) {
    return;
  }

  // Get latest index
  const names = indexItems.value.map(({ title }) => title).sort();
  index.value = names.at(-1) ?? '';
}, { once: true });
</script>
