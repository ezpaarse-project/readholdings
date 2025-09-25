<template>
  <v-btn
    v-tooltip:bottom="$t('report.reloadState')"
    :disabled="loading"
    icon="mdi-reload"
    variant="text"
    @click.stop="$emit('getState')"
  />
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
});

defineEmits({
  getState: () => true,
});
</script>
