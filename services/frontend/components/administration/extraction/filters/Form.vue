<template>
  <v-row>
    <v-col cols="12">
      <template v-if="filterMap.size > 0">
        <v-chip
          v-for="[key, filter] in filterMap"
          :key="key"
          :text="filter.name"
          :color="filter.isNot ? 'red' : 'blue'"
          density="compact"
          closable
          class="mr-2"
          @click="openForm(filter)"
          @click:close="removeFilter(filter)"
        />
      </template>
      <span v-else class="text-medium-emphasis">
        {{ $t('administration.extraction.filters.empty') }}
      </span>

      <v-menu v-model="isFormOpen" :close-on-content-click="false" target="parent">
        <v-card
          :title="editingFilter ? $t('administration.extraction.filters.title:edit') : $t('administration.extraction.filters.title:new')"
          prepend-icon="mdi-filter-plus"
          variant="outlined"
        >
          <template #append>
            <v-btn
              v-tooltip="$t('administration.extraction.filters.advanced')"
              :color="isRawMode ? 'orange' : 'grey'"
              variant="text"
              icon="mdi-tools"
              density="comfortable"
              @click="isRawMode = !isRawMode"
            />
          </template>

          <template #text>
            <v-form v-model="isValid" :disabled="disabled">
              <template v-if="isRawMode">
                <v-row>
                  <v-col>
                    <v-textarea
                      v-model="rawFilterJSON"
                      :label="$t('administration.extraction.filters.raw')"
                      prepend-icon="mdi-cursor-text"
                      variant="outlined"
                      required
                    />
                  </v-col>
                </v-row>
              </template>

              <template v-else>
                <v-row>
                  <v-col>
                    <v-combobox
                      v-model="field"
                      :label="$t('administration.extraction.filters.field')"
                      :items="fieldsItems"
                      :rules="[(v) => !!v || $t('required')]"
                      :return-object="false"
                      prepend-icon="mdi-form-textbox"
                      variant="underlined"
                      required
                    />
                  </v-col>
                </v-row>

                <v-row>
                  <v-col>
                    <MultiTextField
                      v-model="values"
                      :label="$t('administration.extraction.filters.value')"
                      prepend-icon="mdi-cursor-text"
                      variant="underlined"
                    />
                  </v-col>
                </v-row>
              </template>

              <v-row>
                <v-col cols="8">
                  <p class="text-medium-emphasis">
                    {{ $t('administration.extraction.filters.hints.type') }}

                    <ul class="pl-3">
                      <li>{{ $t('administration.extraction.filters.hints.type:exists') }}</li>
                      <li>{{ $t('administration.extraction.filters.hints.type:is') }}</li>
                      <li>{{ $t('administration.extraction.filters.hints.type:in') }}</li>
                    </ul>
                  </p>
                </v-col>

                <v-col cols="4">
                  <v-checkbox v-model="isNot" :label="$t('administration.extraction.filters.isNot')" />

                  <v-text-field
                    :model-value="filterType"
                    :label="$t('administration.extraction.filters.type')"
                    variant="plain"
                    prepend-icon="mdi-format-list-bulleted"
                    disabled
                  />
                </v-col>
              </v-row>

              <v-row>
                <v-col>
                  <v-text-field
                    v-model="name"
                    :label="$t('administration.extraction.filters.name')"
                    :rules="[(v) => !!v || $t('required')]"
                    prepend-icon="mdi-rename"
                    variant="underlined"
                    required
                    @update:model-value="hasNameChanged = true"
                  />
                </v-col>
              </v-row>
            </v-form>
          </template>

          <template #actions>
            <v-spacer />

            <v-btn
              :text="$t('cancel')"
              variant="text"
              @click="isFormOpen = false"
            />

            <v-btn
              :text="$t('create')"
              :disabled="!isValid"
              prepend-icon="mdi-content-save"
              variant="elevated"
              color="primary"
              @click="submitFilter()"
            />
          </template>
        </v-card>
      </v-menu>
    </v-col>

    <v-col cols="12">
      <v-btn
        :text="$t('administration.extraction.filters.add')"
        :disabled="disabled"
        append-icon="mdi-plus"
        variant="outlined"
        color="green"
        @click="openForm()"
      />
    </v-col>
  </v-row>
</template>

<script setup>
import { elasticTypeAliases, elasticTypeIcons } from '@/lib/elastic';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => undefined,
  },
  mapping: {
    type: Object,
    default: () => ({}),
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits({
  'update:modelValue': (v) => v === undefined || Array.isArray(v),
});

const { t } = useI18n();

const isFormOpen = shallowRef(false);
const isValid = shallowRef(false);
const isRawMode = shallowRef(false);
/** @type {Ref<object|null>} */
const editingFilter = ref(null);
const hasNameChanged = shallowRef(false);
const field = shallowRef('');
/** @type {Ref<string[]>} */
const values = ref([]);
const name = shallowRef('');
const isNot = shallowRef(false);
const rawFilterJSON = shallowRef('');

const filterMap = ref(new Map(props.modelValue?.map((f) => [f.name, f])));

/** Type of the filter */
const filterType = computed(() => {
  if (isRawMode.value) {
    return '';
  }
  if (values.value == null || values.value?.length === 0) {
    return t('administration.extraction.filters.types.exists');
  }
  if (Array.isArray(values.value)) {
    return t('administration.extraction.filters.types.in');
  }
  return t('administration.extraction.filters.types.is');
});

const fieldsItems = computed(() => {
  if (!props.mapping) {
    return [];
  }

  return Object.entries(props.mapping).map(([key, type]) => ({
    value: key,
    title: key,
    props: {
      subtitle: type,
      appendIcon: elasticTypeIcons.get(elasticTypeAliases.get(type) || ''),
    },
  }));
});

function updateFilters() {
  const vals = Array.from(filterMap.value.values());
  emit('update:modelValue', vals.length > 0 ? vals : undefined);
}

function openForm(filter) {
  editingFilter.value = filter && { ...filter };

  field.value = filter?.field || '';
  name.value = filter?.name || '';
  isNot.value = filter?.isNot || false;

  let rawJSON = '';
  if (filter && 'raw' in filter) {
    rawJSON = JSON.stringify(filter.raw, undefined, 2);
  } else {
    const value = (Array.isArray(filter?.value) ? filter.value : [filter?.value])
      .filter((v) => !!v);
    values.value = value;
  }

  rawFilterJSON.value = rawJSON;
  isRawMode.value = rawJSON !== '';

  hasNameChanged.value = false;
  isFormOpen.value = true;
}

function submitFilter() {
  const filter = { name: name.value, isNot: isNot.value };
  if (!isRawMode.value) {
    let filterValue = values.value;
    if (filterValue.length === 1) { ([filterValue] = filterValue); }
    if (filterValue.length === 0) { filterValue = undefined; }
    filter.value = filterValue;
    filter.field = field.value;
  } else {
    filter.raw = JSON.parse(rawFilterJSON.value);
  }

  filterMap.value.set(editingFilter.value?.name ?? filter.name, filter);
  updateFilters();

  isFormOpen.value = false;
  editingFilter.value = null;
}

function removeFilter(filter) {
  filterMap.value.delete(filter.name);
  updateFilters();
}

function generateFilterName() {
  // Don't generate name if it's a raw filter
  if (isRawMode.value) {
    return '';
  }

  // We need a field to generate a name
  if (!field.value) {
    return '';
  }

  // Ensure values are an array
  let vals = values.value ?? '';
  if (!Array.isArray(vals)) {
    vals = [vals];
  }

  // Generate value text
  const valueText = t('administration.extraction.filters.nameTemplate.values', vals, vals.length - 1);
  const data = { field: field.value, valueText };

  // Generate name
  if (values.value == null) {
    if (isNot.value) {
      return t('administration.extraction.filters.nameTemplate.exists:not', data);
    }
    return t('administration.extraction.filters.nameTemplate.exists', data);
  } if (isNot.value) {
    return t('administration.extraction.filters.nameTemplate.is:not', data);
  }
  return t('administration.extraction.filters.nameTemplate.is', data);
}

/**
 * Generate name when filter changes
 */
watch(computed(() => [field.value, values.value, isNot.value]), () => {
  if (editingFilter.value || hasNameChanged.value) {
    return;
  }

  const n = generateFilterName();
  if (n) {
    name.value = n;
  }
}, { deep: true });
</script>
