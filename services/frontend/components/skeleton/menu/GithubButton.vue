<template>
  <div class="text-center ma-2">
    <v-btn
      :href="gitHubRepo"
      size="small"
      variant="outlined"
      append-icon="mdi-github"
      target="_blank"
      rel="noopener noreferrer"
    >
      Version: {{ version }}
    </v-btn>
  </div>
</template>

<script setup>
const runtimeConfig = useRuntimeConfig();

const version = computed(() => runtimeConfig.public.version);
const gitHubRepo = computed(() => runtimeConfig.public.gitHubRepoURL);
</script>
