<template>
  <v-navigation-drawer
    :value="visible"
    width="300"
    clipped
    app
    fixed
    disable-resize-watcher
    disable-route-watcher
    class="nav-bar"
    @input="updateVisible($event)"
  >
    <v-list :opened="['admin', 'lang']">
      <SkeletonMenuListRouter />
      <SkeletonMenuAdminMenu />
      <SkeletonMenuLangMenu />
    </v-list>

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

<style scoped>
.nav-bar :deep(.v-list-item-title) {
  font-size: 0.8125em;
  font-weight: 500;
}
</style>
