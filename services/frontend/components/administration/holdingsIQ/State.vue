<template>
  <v-container fluid>
    <v-row>
      <v-col v-if="state.createdAt" cols="4">
        <v-card
          :title="format(state.createdAt, 'PPPpp', { locale: dateLocale })"
          :subtitle="$t('administration.holdingsIQ.createdAt')"
          variant="flat"
          density="compact"
        >
          <template #prepend>
            <v-avatar
              icon="mdi-clock"
              class="bg-grey mr-2"
              style="border-radius: 10%;"
            />
          </template>
        </v-card>
      </v-col>

      <v-col v-else>
        <v-alert
          :title="$t('administration.holdingsIQ.noUpdate.title')"
          :text="$t('administration.holdingsIQ.noUpdate.text')"
          type="warning"
        />
      </v-col>
    </v-row>

    <v-row
      v-for="group in stateGrouped"
      :key="group.key"
      :class="['border', 'border-opacity-50', `border-${STATUS_STYLES[group.status].color}`, 'rounded', 'mb-2']"
    >
      <v-col cols="3">
        <v-card
          :title="group.name"
          :subtitle="$t(`administration.holdingsIQ.types.${group.type}`)"
          variant="flat"
          density="compact"
        >
          <template #prepend>
            <v-avatar
              :icon="TYPE_STYLES[group.type]?.icon || 'mdi-help'"
              :class="[`bg-${TYPE_STYLES[group.type]?.color || 'grey'}`, 'mr-2']"
              style="border-radius: 10%;"
            />
          </template>
        </v-card>
      </v-col>

      <v-col cols="3">
        <v-card
          :title="$t(`administration.holdingsIQ.status.${group.status}`)"
          :subtitle="$t('administration.holdingsIQ.status:title')"
          variant="flat"
          density="compact"
        >
          <template #prepend>
            <v-avatar
              :icon="STATUS_STYLES[group.status].icon"
              :class="[`bg-${STATUS_STYLES[group.status].color}`, 'mr-2']"
              style="border-radius: 10%;"
            />
          </template>
        </v-card>
      </v-col>

      <v-col v-if="group.status === 'inProgress'" cols="3">
        <v-card
          :title="group.running.fileType"
          :subtitle="group.running.name"
          variant="flat"
          density="compact"
        >
          <template #prepend>
            <v-progress-circular
              size="24"
              width="2"
              color="blue"
              indeterminate
              class="mr-6"
            />
          </template>
        </v-card>
      </v-col>

      <v-col cols="3">
        <v-card
          v-if="group.status === 'error'"
          :title="group.error.fileType"
          :subtitle="group.error.name"
          variant="flat"
          density="compact"
        >
          <template #prepend>
            <v-avatar
              icon="mdi-alert-circle"
              class="bg-error mr-2"
              style="border-radius: 10%;"
            />
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { format } from 'date-fns';

const TYPE_STYLES = {
  portal: {
    color: 'primary',
    icon: 'mdi-domain',
  },
  task: {
    color: 'green',
    icon: 'mdi-file-tree',
  },
};

const STATUS_STYLES = {
  done: {
    color: 'success',
    icon: 'mdi-check',
  },
  inProgress: {
    color: 'blue',
    icon: 'mdi-clock',
  },
  error: {
    color: 'error',
    icon: 'mdi-close',
  },
};

const props = defineProps({
  status: { type: Boolean, default: false },
});

const { $fetch } = useNuxtApp();
const { t } = useI18n();
const { locale: dateLocale } = useDateLocale();

const loading = shallowRef(false);
const state = ref({});
let intervalId = null;

const stateGrouped = computed(() => {
  const groups = Object.groupBy(state.value?.steps ?? [], (item) => item.key);

  return Object.entries(groups).map(([key, steps]) => {
    const [type, name] = key.split(':');

    let label = '';
    if (type === 'task') {
      label = t(`administration.holdingsIQ.tasks.${name}`);
    }

    let status = 'done';

    const inProgressSteps = steps.filter((step) => step.status === 'inProgress');
    if (inProgressSteps.length > 0) {
      status = 'inProgress';
    }

    const errorSteps = steps.filter((step) => step.status === 'error');
    if (errorSteps.length > 0) {
      status = 'error';
    }

    return {
      key,
      type,
      name: label || name,
      status,
      running: inProgressSteps.at(0),
      error: errorSteps.at(0),
    };
  });
});

async function getState() {
  loading.value = true;

  let res;

  try {
    res = await $fetch('/state', {
      method: 'GET',
    });
  } catch (err) {
    loading.value = false;
    return;
  }

  state.value = res;

  if (state.value.status === 'done' || state.value.status === 'error') {
    clearInterval(intervalId);
  }

  loading.value = false;
}

watch(
  () => props.status,
  (newValue) => {
    if (newValue) {
      intervalId = setInterval(async () => { await getState(); }, 1000);
    }
  },
);

onBeforeUnmount(() => {
  clearInterval(intervalId);
});

defineExpose({
  getState,
});

onMounted(async () => {
  await getState();
});

</script>
