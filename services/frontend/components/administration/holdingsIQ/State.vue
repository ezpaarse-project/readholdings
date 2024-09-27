<template>
  <div>
    <v-row v-if="state.createdAt" justify="center" class="ma-4">
      Date: {{ state.createdAt }}
    </v-row>
    <v-row v-for="portal in portals" :key="portal.name" justify="center">
      <v-col cols="1">
        <p> {{ portal }} </p>
      </v-col>
      <v-col v-if="stateGrouped[portal].every(step => step.status === 'done')" cols="1">
        <v-icon color="green">
          mdi-circle
        </v-icon>
      </v-col>
      <v-col v-if="stateGrouped[portal].some(step => step.status === 'inProgress')" cols="1">
        <v-progress-circular size="24" width="2" indeterminate color="blue" />
      </v-col>
      <v-col v-if="stateGrouped[portal].some(step => step.status === 'inProgress')" cols="10">
        {{ stateGrouped[portal].filter(step => step.status === 'inProgress')[0].fileType }} -
        {{ stateGrouped[portal].filter(step => step.status === 'inProgress')[0].name }}
      </v-col>
      <v-col v-if="stateGrouped[portal].some(step => step.status === 'error')" cols="1">
        <v-icon color="red">
          mdi-circle
        </v-icon>
      </v-col>
      <v-col v-if="stateGrouped[portal].some(step => step.status === 'error')" cols="10">
        {{ stateGrouped[portal].filter(step => step.status === 'error')[0].fileType }} -
        {{ stateGrouped[portal].filter(step => step.status === 'error')[0].name }}
      </v-col>
    </v-row>
  </div>
</template>

<script setup>

const { $fetch } = useNuxtApp();

const props = defineProps({
  status: { type: Boolean, default: false },
});

const loading = ref(false);
const state = ref({});
let intervalId = null;

const stateGrouped = computed(() => {
  const steps = state.value?.steps ?? [];
  return Object.groupBy(steps, (item) => item.portal);
});

const portals = computed(() => Object.keys(stateGrouped.value));

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

  if (state.value.status === 'done') {
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

defineExpose({
  getState,
});

onMounted(async () => {
  await getState();
});

</script>
