<template>
  <section v-if="isAdmin" class="ma-3">
    <AdministrationHealthTab class="my-4" />
  </section>
</template>

<script setup>

definePageMeta({
  middleware: 'admin'
});

const adminStore = useAdminStore();

const isAdmin = computed(() => adminStore.isAdmin);

</script>
