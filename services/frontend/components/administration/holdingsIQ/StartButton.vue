<template>
  <v-btn :loading="loading" :disabled="props.status" @click.stop="startUpdate()">
    {{ t("update") }}
  </v-btn>
</template>

<script setup>

const emit = defineEmits(['update']);

const { t } = useI18n();
const snackStore = useSnacksStore();
const adminStore = useAdminStore();
const { $fetch } = useNuxtApp();

const { password } = storeToRefs(adminStore);

const props = defineProps({
  status: { type: Boolean, default: false },
});

const loading = ref(false);

async function startUpdate() {
  loading.value = true;

  try {
    await $fetch('/holdingsIQ/update', {
      method: 'POST',
      headers: {
        'x-api-key': password.value,
      },
    });
  } catch (err) {
    snackStore.error(t('error.holdingsIQ.update'));
    loading.value = false;
    return;
  }

  loading.value = false;
  snackStore.success(t('info.holdingsIQ.update'));

  emit('update');
}

</script>
