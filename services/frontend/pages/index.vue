<template>
  <v-container>
    <v-container class="d-flex justify-center align-center">
      <v-img
        src="@/static/images/readholdings.jpg"
        max-width="300"
      />
    </v-container>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="12" md="12">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">
            Readholdings
          </v-card-title>
          <v-card-text class="text-body-1">
            {{ t("home.text1") }}
          </v-card-text>
          <v-card-text class="text-body-1">
            {{ t("home.text2") }}
          </v-card-text>
          <v-card-text class="text-body-1">
            {{ t("home.text3") }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const { t } = useI18n();

</script>

<style scoped>

</style>
