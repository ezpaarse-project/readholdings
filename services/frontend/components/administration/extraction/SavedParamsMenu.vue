<template>
  <v-menu v-model="isOpen" :close-on-content-click="false" width="400">
    <template #activator="activator">
      <slot name="activator" v-bind="activator" :loading="status === 'pending'" />
    </template>

    <v-sheet>
      <div class="d-flex align-center pa-2" style="height: 60px;">
        <div style="flex: 1;">
          <v-slide-x-transition>
            <v-text-field
              v-if="isSavingFormOpen"
              v-model="paramsName"
              :label="$t('administration.extraction.savedParams.name')"
              prepend-icon="mdi-rename"
              variant="outlined"
              density="compact"
              hide-details
              class="mr-4"
            />
          </v-slide-x-transition>
        </div>

        <div class="text-end">
          <v-btn
            v-if="!isSavingFormOpen"
            icon="mdi-plus"
            density="comfortable"
            color="success"
            variant="text"
            @click="openSavingForm()"
          />

          <template v-else>
            <v-btn
              :disabled="!paramsName"
              :loading="saveLoading"
              icon="mdi-check"
              density="comfortable"
              color="success"
              variant="flat"
              class="mr-2"
              @click="saveCurrentParams(paramsName)"
            />
            <v-btn
              icon="mdi-close"
              density="comfortable"
              variant="flat"
              @click="isSavingFormOpen = false"
            />
          </template>
        </div>
      </div>

      <v-divider />

      <v-list v-if="(data?.length ?? 0) > 0" lines="2">
        <v-list-item
          v-for="item in data"
          :key="item.name"
          :title="item.name"
          :subtitle="format(item.updatedAt, 'PPPpp', { locale: dateLocale })"
          prepend-icon="mdi-content-save-outline"
          @click="changeCurrentParams(item)"
        >
          <template #append>
            <v-btn
              density="comfortable"
              variant="text"
              icon="mdi-file-replace-outline"
              color="blue"
              class="ml-1"
              @click.stop="saveCurrentParams(item.name)"
            />

            <v-btn
              density="comfortable"
              variant="text"
              icon="mdi-delete"
              color="red"
              class="ml-1"
              @click.stop="deleteParams(item)"
            />
          </template>
        </v-list-item>
      </v-list>

      <v-empty-state
        v-else
        :title="$t('administration.extraction.savedParams.noParams.title')"
        :text="$t('administration.extraction.savedParams.noParams.description')"
        icon="mdi-content-save-off"
      />
    </v-sheet>
  </v-menu>
</template>

<script setup>
import { format } from 'date-fns';

const props = defineProps({
  params: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits({
  'update:params': (item) => !!item,
});

const { t } = useI18n();
const { locale: dateLocale } = useDateLocale();
const { $fetch } = useNuxtApp();
const snackStore = useSnacksStore();

const { password } = storeToRefs(useAdminStore());

const isOpen = shallowRef(false);
const isSavingFormOpen = shallowRef(false);
const saveLoading = shallowRef(false);
const paramsName = shallowRef('');

const {
  data,
  status,
  refresh,
} = await useFetch('/extract/saved-params', {
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
      snackStore.error(t('error.extraction.index.get', { err: err.message }));
      throw err;
    }
  },
});

async function deleteParams(item) {
  try {
    await $fetch(`/extract/saved-params/${item.name}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': password.value,
      },
    });

    refresh();
  } catch (err) {
    snackStore.error(t('error.extraction.save', { err: err.message }));
  }
}

async function saveCurrentParams(name) {
  if (!name) {
    return;
  }

  saveLoading.value = true;
  try {
    await $fetch(`/extract/saved-params/${name}`, {
      method: 'PUT',
      headers: {
        'X-API-KEY': password.value,
      },
      body: { ...props.params },
    });

    paramsName.value = '';
    isSavingFormOpen.value = false;
    refresh();
  } catch (err) {
    snackStore.error(t('error.extraction.save', { err: err.message }));
  }
  saveLoading.value = false;
}

function openSavingForm() {
  paramsName.value = props.params.comment || '';
  isSavingFormOpen.value = true;
}

function changeCurrentParams(item) {
  emit('update:params', {
    ...item,
    index: props.params.index,
    updatedAt: undefined,
    name: undefined,
  });
}

// Refresh data when menu is opened
watch(isOpen, () => {
  if (isOpen.value) {
    refresh();
  }
});
</script>
