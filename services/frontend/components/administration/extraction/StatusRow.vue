<template>
  <v-row>
    <v-col>
      <h4 class="mb-2">
        {{ $t('administration.extraction.status.toolbar') }}
      </h4>

      <v-alert
        v-if="state.error"
        :title="$t('administration.extraction.status.error')"
        :text="state.error.message"
        type="error"
        class="mb-4"
      />

      <v-chip
        v-tooltip="statusChip.tooltip"
        :prepend-icon="statusChip.icon"
        :color="statusChip.color"
        :text="statusChip.text"
        size="large"
      />

      <v-progress-circular
        v-if="state.progress > 0 || state.status !== 'idle'"
        color="primary"
        :model-value="progress.value"
        :indeterminate="state.progress === 0"
        width="2"
        size="64"
        class="ml-4"
      >
        {{ progress.text }}
      </v-progress-circular>
    </v-col>
  </v-row>
</template>

<script setup>
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
const { $fetch } = useNuxtApp();
const snackStore = useSnacksStore();

const { password } = storeToRefs(useAdminStore());

const statusChip = computed(() => {
  const titlePrefix = 'administration.extraction.status.title';
  const meaningPrefix = 'administration.extraction.status.meaning';

  switch (props.state.status) {
    case 'idle':
      if (props.state.progress && props.isWatching) {
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
  value: props.state.progress * 100,
  text: props.state.progress.toLocaleString(locale.value, { style: 'percent' }),
}));

async function cancelGeneration() {
  if (props.state.status === 'running') {
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
    snackStore.error(t('error.extraction.unableToStop'));
  }
}
</script>
