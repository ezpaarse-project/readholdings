<template>
  <section v-if="isAdmin" class="ma-3">
    <AdministrationHlmCard />
  </section>
</template>

<script setup>

definePageMeta({
  middleware: 'admin'
});

const adminStore = useAdminStore();
const isAdmin = computed(() => adminStore.isAdmin);

</script>
