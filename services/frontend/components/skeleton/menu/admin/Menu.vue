<template>
  <v-list-item
    v-if="!adminStore.isAdmin"
    :title="$t('administration.title')"
    to="/administration"
    prepend-icon="mdi-security"
  />

  <v-list-group v-else value="admin">
    <template #activator="{ props }">
      <v-list-item
        :title="$t('administration.title')"
        prepend-icon="mdi-security"
        v-bind="props"
      />
    </template>

    <SkeletonMenuAdminList />
  </v-list-group>
</template>

<script setup>
const adminStore = useAdminStore();
</script>
