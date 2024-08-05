<template>
  <v-card>
    <v-toolbar color="secondary" dark flat dense>
      <v-toolbar-title>
        {{ t("administration.hlm.title") }}
      </v-toolbar-title>
    </v-toolbar>
    <v-card-actions>
      <v-spacer />
      <AdministrationHlmImportButton
        :dataToImport="dataToImport"
        @import="handleImport()"
      />
    </v-card-actions>
    <v-file-input
      v-model="files"
      :label="t('administration.hlm.fileInput')"
      :placeholder="t('administration.hlm.fileInput')"
      prepend-icon="mdi-paperclip"
      multiple
    >
      <template v-slot:selection="{ fileNames }">
        <template v-for="fileName in fileNames" :key="fileName">
          <v-chip
            class="me-2"
            color="primary"
            size="small"
            label
          >
            {{ fileName }}
          </v-chip>
        </template>
      </template>
    </v-file-input>
    <v-list>
      <AdministrationHlmFileItem
        v-for="(file, index) in files"
        :key="file.name"
        :file="file"
        @update-portal="handlePortalUpdate(index, $event)"
        @remove="removeItem(index)"
      />
    </v-list>
  </v-card>
</template>

<script setup>

const { t } = useI18n();

const files = ref([]);
const portals = ref([]);

const dataToImport = computed(() => {
  let data = [];
  files.value.forEach((file, index) => {
    const portal = portals.value[index];
    const mergedObject = { file, portal };
    data.push(mergedObject);
  });
  return data;
})

const handlePortalUpdate = (index, portal) => {
  portals.value[index] = portal
};

const handleImport = () => {
  portals.value = []
  files.value = []
};

const removeItem = (index) => {
  files.value.splice(index, 1);
  portals.value.splice(index, 1);
};

</script>