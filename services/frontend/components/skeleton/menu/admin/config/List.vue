<template>
  <v-list>
    <v-list-item 
      v-for="config in configs"
      :key="config.name"
      :title="config.name"
      link
      router
      :to="{ path: config.path }"
    >
      <template v-slot:prepend>
        <v-icon :icon="config.icon" />
      </template>
    </v-list-item>
  </v-list>
</template>
  
<script setup>

const configs = ref([
  { name: "API", icon: "mdi-api", path: "/administration/config/api" },
  { name: "Interface", icon: "mdi-application", path: "/administration/config/frontend" }
])

</script>
  