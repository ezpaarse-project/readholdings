<template>
  <v-navigation-drawer
    :value="visible"
    width="300"
    clipped
    app
    fixed
    disable-resize-watcher
    disable-route-watcher
    @input="updateVisible($event)"
  >
    <SkeletonMenuListRouter />
    <SkeletonMenuAdminMenu />
    <SkeletonMenuLangMenu />
    <v-spacer />
    <template #append>
      <SkeletonMenuThemeButton />
      <SkeletonMenuGithubButton />
    </template>
  </v-navigation-drawer>
</template>

<script setup>

const visible = defineProps({
  value: { type: Boolean, default: false },
});

const emit = defineEmits({
  updated: () => true,
});

async function updateVisible() {
  emit('updated');
}
</script>
