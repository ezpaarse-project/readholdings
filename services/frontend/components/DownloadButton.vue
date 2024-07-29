<template>
  <v-btn icon="mdi-download" variant="plain" class="ma-0" @click="downloadItem()" />
</template>

<script setup>

const props = defineProps({
  text: { type: String, default: '' },
});

function downloadItem() {
  const element = document.createElement('a');
  const stringifiedApikey = encodeURIComponent(props.text);
  element.setAttribute('href', `data:text/plain;charset=utf-8,${stringifiedApikey}`);
  element.setAttribute('download', `${new Date().toISOString()}.apikeys-export.json`);
  element.style.display = 'none';
  element.click();
}

</script>