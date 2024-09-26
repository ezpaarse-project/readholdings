<template>
  <v-tooltip location="bottom">
    <template #activator="activator">
      <v-btn
        v-bind="activator.props"
        icon="mdi-reload"
        :disabled="props.loading"
        @click.stop="getState()"
      />
    </template>
    {{ t("report.reloadState") }}
  </v-tooltip>
</template>

<script setup>

const { t } = useI18n();

const props = defineProps({
  loading: { type: Boolean, default: false },
});

const emit = defineEmits({
  getState: () => true,
});

function getState() {
  emit('getState');
}

</script>
