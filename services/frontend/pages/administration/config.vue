<template>
  <section class="ma-3">
    <v-tabs v-model="tab" fixed-tabs>
      <v-tab value="api">
        API
      </v-tab>
      <v-tab value="frontend">
        frontend
      </v-tab>
    </v-tabs>
    <v-tabs-window v-model="tab">
      <v-tabs-window-item value="api">
        <AdministrationConfigAPICard />
      </v-tabs-window-item>
      <v-tabs-window-item value="frontend">
        <AdministrationConfigFrontendCard />
      </v-tabs-window-item>
    </v-tabs-window>
  </section>
</template>

<script setup>

const tab = ref('admin');

definePageMeta({
  middleware: 'admin',
});

</script>
