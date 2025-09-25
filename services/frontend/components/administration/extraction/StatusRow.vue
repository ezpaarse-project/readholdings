<template>
  <v-row>
    <v-col cols="4">
      <v-card
        :title="statusChip.text"
        :subtitle="$t('administration.extraction.status.toolbar')"
        variant="flat"
      >
        <template #prepend>
          <v-avatar
            v-tooltip:top="statusChip.tooltip"
            :icon="statusChip.icon"
            :class="[`bg-${statusChip.color}`, `mr-2`]"
            style="border-radius: 10%;"
          />
        </template>

        <template v-if="state.status === 'running'" #append>
          <v-btn
            v-tooltip:top="$t('administration.extraction.form.stop')"
            icon="mdi-stop"
            color="red"
            density="comfortable"
            @click="stopGeneration()"
          />
        </template>

        <template v-if="state.progress.percent > 0 || state.status !== 'idle'" #text>
          <div class="position-relative">
            <v-progress-linear
              v-tooltip:top="progress.tooltip"
              :model-value="progress.value"
              :indeterminate="state.progress.percent === 0"
              :color="statusChip.color"
              height="8"
              rounded
            />

            <div
              :class="['progress--value', `text-${statusChip.color}`]"
              :style="{ width: `${progress.value}%`, minWidth: `${progress.text.length}em` }"
            >
              {{ progress.text }}
            </div>
          </div>
        </template>
      </v-card>
    </v-col>

    <v-col cols="4">
      <v-card
        v-if="took"
        :title="took"
        :subtitle="$t('administration.extraction.status.took')"
        variant="flat"
      >
        <template #prepend>
          <v-avatar
            icon="mdi-clock-outline"
            class="bg-grey mr-2"
            style="border-radius: 10%;"
          />
        </template>
      </v-card>
    </v-col>

    <v-col cols="4">
      <v-card
        v-if="state.status === 'running' && estimatedTime"
        :title="estimatedTime"
        :subtitle="$t('administration.extraction.status.eta')"
        variant="flat"
      >
        <template #prepend>
          <v-avatar
            icon="mdi-timer-outline"
            class="bg-green mr-2"
            style="border-radius: 10%;"
          />
        </template>
      </v-card>
    </v-col>

    <v-col v-if="state.error" cols="12">
      <v-alert
        :title="$t('administration.extraction.status.error')"
        :text="state.error.message"
        type="error"
        class="mb-4"
      />
    </v-col>
  </v-row>
</template>

<script setup>
import { formatDistance } from 'date-fns';

const props = defineProps({
  state: {
    type: Object,
    required: true,
  },
  isWatching: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits({
  'update:state': (v) => !!v,
});

const { t, locale } = useI18n();
const { locale: dateLocale } = useDateLocale();
const { $fetch } = useNuxtApp();
const snackStore = useSnacksStore();

const { password } = storeToRefs(useAdminStore());

const statusChip = computed(() => {
  const titlePrefix = 'administration.extraction.status.title';
  const meaningPrefix = 'administration.extraction.status.meaning';

  switch (props.state.status) {
    case 'idle':
      if (props.state.progress.percent > 0 && props.isWatching) {
        return {
          color: 'success',
          icon: 'mdi-check',
          text: t(`${titlePrefix}.success`),
          tooltip: t(`${meaningPrefix}.success`),
        };
      }

      return {
        color: 'grey',
        icon: 'mdi-dots-horizontal',
        text: t(`${titlePrefix}.idle`),
        tooltip: t(`${meaningPrefix}.idle`),
      };

    case 'running':
      return {
        color: 'blue',
        icon: 'mdi-clock',
        text: t(`${titlePrefix}.running`),
        tooltip: t(`${meaningPrefix}.running`),
      };

    case 'stopped':
      return {
        color: 'red',
        icon: 'mdi-alert',
        text: t(`${titlePrefix}.stopped`),
        tooltip: t(`${meaningPrefix}.stopped`),
      };

    case 'error':
      return {
        color: 'error',
        icon: 'mdi-close',
        text: t(`${titlePrefix}.error`),
        tooltip: t(`${meaningPrefix}.error`),
      };

    default:
      return {
        color: 'warning',
        icon: 'mdi-question',
        text: t(`${titlePrefix}.unknown`),
        tooltip: props.state.status,
      };
  }
});

const progress = computed(() => ({
  value: props.state.progress.percent * 100,
  text: props.state.progress.percent.toLocaleString(locale.value, { style: 'percent' }),
  tooltip: t('administration.extraction.status.progress', {
    current: props.state.progress.current.toLocaleString(locale.value),
    total: props.state.progress.total.toLocaleString(locale.value),
  }),
}));

const took = computed(() => {
  const { startedAt, endedAt } = props.state;
  if (!startedAt) {
    return undefined;
  }

  return formatDistance(
    startedAt,
    endedAt ?? new Date(),
    { locale: dateLocale.value, includeSeconds: true },
  );
});

const estimatedTime = computed(() => {
  const { total, current, speed } = props.state.progress;

  const toDo = total - current;
  const remainingMs = (1 / (speed || 1)) * toDo;

  if (Number.isNaN(remainingMs)) {
    return undefined;
  }

  return formatDistance(
    0,
    remainingMs,
    { locale: dateLocale.value, includeSeconds: true },
  );
});

async function stopGeneration() {
  if (props.state.status !== 'running') {
    return;
  }

  try {
    const newState = await $fetch('/extract/_stop', {
      method: 'POST',
      headers: {
        'X-API-KEY': password.value,
      },
    });

    emit('update:state', newState);
  } catch (err) {
    snackStore.error(t('error.extraction.stop', { err: err.message }));
  }
}
</script>

<style lang="css" scoped>
.progress--value {
  position: absolute;
  text-align: center;
  /* transition extracted from vuetify CSS */
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
