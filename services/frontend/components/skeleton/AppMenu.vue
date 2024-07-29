<template>
  <v-navigation-drawer :value="visible" width="300" @input="updateVisible($event)" clipped app
    fixed disable-resize-watcher disable-route-watcher>
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
  value: { type: Boolean, default: false }
});

const emit = defineEmits({
  updated: () => true
})

async function updateVisible() {
  emit('updated');
};
</script>