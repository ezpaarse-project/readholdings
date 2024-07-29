<template>
  <v-list-item v-if="!isAdmin" link router :to="{ path: '/administration' }" ripple :title="t('menu.administration')">
    <template v-slot:prepend>
      <v-icon icon="mdi-security"></v-icon>
    </template>
  </v-list-item>
  <v-list v-else v-model:opened="open">
    <v-list-group value="Admin">
      <template v-slot:activator="{ props }">
        <v-list-item v-bind="props" :title="t('menu.administration')">
          <template v-slot:prepend>
            <v-icon icon="mdi-security"></v-icon>
          </template>
        </v-list-item>
      </template>
      <SkeletonMenuAdminList />
    </v-list-group>
  </v-list>
</template>

<script setup>

const { t } = useI18n()

const adminStore = useAdminStore();

const isAdmin = computed(() => adminStore.isAdmin);

const open = ref(['Admin']);

</script>
