<template>
  <v-list v-model:opened="open">
    <v-list-group value="Lang">
      <template #activator="{ props }">
        <v-list-item v-bind="props" :title="t('language')" />
      </template>
      <SkeletonMenuLangList />
    </v-list-group>
  </v-list>
</template>

<script setup>

const { t } = useI18n();

const open = ref(['Lang']);

</script>
