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
          :placeholder="$t('administration.extraction.form.fields:placeholder')"
          :items="fieldsItems"
          :loading="mappingStatus === 'pending' && 'primary'"
          :rules="fieldsRules"
          prepend-icon="mdi-format-list-bulleted"
          variant="underlined"
          multiple
          chips
          closable-chips
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

        <AdministrationExtractionFiltersForm
          v-model="filters"
          :mapping="mapping"
          :disabled="state.status === 'running'"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
          v-model="comment"
          :label="$t('administration.extraction.form.comment')"
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
      <v-col cols="6" class="d-flex justify-start">
        <AdministrationExtractionSavedParamsMenu v-model:params="currentParams">
          <template #activator="{ props: menu }">
            <v-btn
              :text="$t('administration.extraction.savedParams.title')"
              :disabled="state.status === 'running'"
              prepend-icon="mdi-content-save-settings"
              variant="outlined"
              v-bind="menu"
            />
          </template>
        </AdministrationExtractionSavedParamsMenu>
      </v-col>

      <v-col cols="6" class="d-flex justify-end">
        <v-btn
          :text="$t('administration.extraction.form.start')"
          :loading="startLoading"
          :disabled="!isValid || state.status === 'running'"
          prepend-icon="mdi-play"
          color="primary"
          type="submit"
        />
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup>
import { elasticTypeAliases, elasticTypeIcons } from '@/lib/elastic';

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

const { t, locale } = useI18n();
const { $fetch } = useNuxtApp();
const snackStore = useSnacksStore();

const { password } = storeToRefs(useAdminStore());

const isValid = shallowRef(false);
const startLoading = shallowRef(false);

const index = shallowRef('');
const fields = ref([]);
const filters = ref([]);
const comment = shallowRef('');
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
      snackStore.error(t('error.extraction.index.get', { err: err.message }));
      throw err;
    }
  },
});

const {
  data: mapping,
  status: mappingStatus,
  // refresh: mappingRefresh,
} = await useFetch(() => `/elastic/indices/${index.value}`, {
  method: 'GET',
  headers: {
    'X-API-KEY': password.value,
  },
  immediate: false,
  // Catch error and prints it in a snack
  $fetch: async (...params) => {
    try {
      return await $fetch(...params);
    } catch (err) {
      snackStore.error(t('error.extraction.index.mapping.get', { err: err.message }));
      throw err;
    }
  },
});

const currentParams = computed({
  get: () => ({
    comment: comment.value,
    encoding: encoding.value.toLowerCase(),

    index: index.value,
    fields: fields.value,
    filters: filters.value,

    delimiter: delimiter.value,
    escape: escape.value,
  }),
  set: (value) => {
    comment.value = value.comment ?? '';
    encoding.value = value.encoding?.toUpperCase() ?? 'UTF-8';

    index.value = value.index;
    fields.value = value.fields ?? [];
    filters.value = value.filters ?? [];

    delimiter.value = value.delimiter ?? ';';
    escape.value = value.escape ?? '"';
  },
});

const indexItems = computed(() => {
  if (!indices.value) {
    return [];
  }

  return indices.value
    .sort((itemA, itemB) => itemA.index.localeCompare(itemB.index, locale.value))
    .map((item) => ({
      value: item.index,
      title: item.index,
      props: {
        subtitle: item['store.size'],
      },
    }));
});

const fieldsItems = computed(() => {
  if (!mapping.value) {
    return [];
  }

  return Object.entries(mapping.value)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB, locale.value))
    .map(([key, type]) => ({
      value: key,
      title: key,
      props: {
        subtitle: type,
        appendIcon: elasticTypeIcons.get(elasticTypeAliases.get(type) || ''),
      },
    }));
});

const fieldsRules = computed(() => [
  (values) => {
    if (!values || values.length === 0) {
      return true;
    }
    if (values.every((field) => fieldsItems.value.find((item) => item.value === field))) {
      return true;
    }
    return t('administration.extraction.form.fields:invalid');
  },
]);

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
      body: { ...currentParams.value },
    });

    emit('update:state', newState);
  } catch (err) {
    snackStore.error(t('error.extraction.start', { err: err.message }));
  }
  startLoading.value = false;
}

// Auto select latest index
watch(indexItems, () => {
  if (!indexItems.value || indexItems.value.length < 0) {
    return;
  }

  // Get latest index
  index.value = indexItems.value.at(-1)?.title ?? '';
}, { once: true });
</script>
