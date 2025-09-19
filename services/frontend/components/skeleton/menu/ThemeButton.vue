<template>
  <div class="pa-2 text-center">
    <v-btn
      v-tooltip="isDark ? $t('theme.light') : $t('theme.dark')"
      :icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
      size="small"
      @click="toggleDarkTheme()"
    />
  </div>
</template>

<script setup>
import { useTheme } from 'vuetify';

const theme = useTheme();

const isDark = computed(() => theme.global.current.value.dark);

function toggleDarkTheme() {
  theme.global.name.value = isDark.value ? 'light' : 'dark';
}
</script>
