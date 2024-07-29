<template>
  <section v-if="!isAdmin" class="ma-3">
    <AdministrationLogin />
  </section>
</template>

<script setup>

const adminStore = useAdminStore();

const isAdmin = computed(() => adminStore.isAdmin);

</script>
