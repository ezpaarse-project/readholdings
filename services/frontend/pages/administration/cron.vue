<template>

</template>

<script setup>

definePageMeta({
  middleware: 'admin',
});

const adminStore = useAdminStore();
const isAdmin = computed(() => adminStore.isAdmin);

</script>
