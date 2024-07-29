<template>
  <v-app>
    <ClientOnly>
      <NuxtLayout>
        <SkeletonAppBar @menuUpdate="updateVisibleMenu()" />
        <SkeletonAppMenu v-model="visible" />
        <Snackbar />
        <ConfirmDialog />
        <v-main>
          <NuxtPage />
        </v-main>
      </NuxtLayout>
    </ClientOnly>
  </v-app>
</template>

<script setup>

let visible = ref(false);

const emit = defineEmits({
  updated: () => true
})

async function updateVisibleMenu() {
  visible.value = !visible.value;
  emit('updated');
};

</script>