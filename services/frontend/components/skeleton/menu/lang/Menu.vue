<template>
  <v-list-group value="lang">
    <template #activator="{ props }">
      <v-list-item
        :title="$t('language')"
        prepend-icon="mdi-translate"
        v-bind="props"
      />
    </template>

    <SkeletonMenuLangList />
  </v-list-group>
</template>

<script setup>
</script>
