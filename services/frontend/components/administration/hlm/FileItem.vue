<template>
  <v-list-item>
    <v-row no-gutters class="d-flex align-center">
      <v-col cols="auto" class="d-flex align-center" style="min-width: 150px;">
        <v-text-field
          v-model="portal"
          :label="t('administration.hlm.portal')"
          class="mr-4"
          variant="solo"
          style="max-width: 200px;"
          @input="updatePortal"
        />
      </v-col>
      <v-col cols="auto" class="d-flex align-center">
        {{ file.name }}
      </v-col>
    </v-row>
    <template #append>
      <v-btn icon="mdi-delete" variant="text" @click.stop="removeSelf()" />
    </template>
  </v-list-item>
</template>

<script setup>

const { t } = useI18n();

const props = defineProps({
  file: { type: Object, required: true },
});

const emit = defineEmits(['update-portal', 'remove']);

const portals = [
  'IN2P3',
  'INC',
  'INEE',
  'INP',
  'INS2I',
  'INSB',
  'INSHS',
  'INSIS',
  'INSMI',
  'INSU',
];

const portal = ref('');

function updatePortal() {
  emit('update-portal', portal.value);
}

onMounted(() => {
  portal.value = portals.find((p) => props?.file?.name?.includes(p)) || '';
  updatePortal();
});

function removeSelf() {
  emit('remove');
}

watch(() => props.file.portal, (newPortal) => {
  portal.value = newPortal;
});

</script>
