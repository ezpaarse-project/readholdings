<template>
  <v-card height="100%">
    <v-card-title class="pa-6">
      <v-row class="justify-center align-center">
        {{ props.name }}
        <v-spacer />
        <v-btn
          :prepend-icon="health ? 'mdi-check' : 'mdi-close'"
          :color="health ? 'success' : 'error'"
          append-icon="mdi-reload"
          variant="text"
          :disabled="loading"
          :loading="loading"
          @click.stop="getHealth()"
          >
          {{ health?.responseTime }} ms
        </v-btn>
      </v-row>
    </v-card-title>
    <v-card-text v-if="name === 'elastic'"> {{ health?.nodes }} </v-card-text>
    <v-card-text v-if="name === 'api'"> {{ runtimeConfig.public.APIURL }} </v-card-text>
  </v-card>
</template>

<script setup>


const runtimeConfig = useRuntimeConfig()
const { $fetch } = useNuxtApp();

const loading = ref(false);
const health = ref({});

const props = defineProps({
  name: { type: String, default: '' },
  url: { type: String, default: '' },
});

/**
 * Get all health.
 * API and Elastic.
 */
async function getHealth() {
  let res;
  loading.value = true;
  try {
    res = await $fetch(props.url, {
      method: 'GET',
    });
  } catch (err) {
    loading.value = false;
    return;
  }
  health.value = res;
  loading.value = false;
}

defineExpose({
  getHealth,
});

onMounted(() => {
  getHealth();
});

</script>
