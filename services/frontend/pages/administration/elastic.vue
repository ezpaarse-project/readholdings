<template>
  <section v-if="isAdmin" class="ma-3">
    <AdministrationElasticImportCard class="my-3" />
    <AdministrationElasticIndexCard />
  </section>
</template>

<script setup>

definePageMeta({
  middleware: 'admin'
});

const adminStore = useAdminStore();
const isAdmin = computed(() => adminStore.isAdmin);

</script>
