<template>
  <div>
    <v-container v-if="adminStore.isAdmin" fluid>
      <AdministrationExtractionCard />
    </v-container>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'admin',
});

const adminStore = useAdminStore();
</script>
