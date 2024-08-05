<template>
  <v-card>
    <v-toolbar
      dark
      color="secondary"
    >
      <v-toolbar-title> {{ t("administration.loginForm") }} </v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form
        v-model="valid"
        @submit.prevent="tryLogin"
      >
        <v-text-field
          v-model="password"
          :append-icon="passwordVisible ? 'mdi-eye' : 'mdi-eye-off'"
          :placeholder="t('administration.password')"
          :rules="[passwordRules]"
          :type="passwordVisible ? 'text' : 'password'"
          :label="t('administration.password')"
          @click:append="passwordVisible = !passwordVisible"
        />
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        variant="tonal"
        :loading="loading"
        :disabled="!valid"
        color="primary"
        @click="tryLogin()"
      >
        {{ t("administration.login") }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>

const snackStore = useSnacksStore();
const adminStore = useAdminStore();

const router = useRouter()

const { t } = useI18n();
const { $fetch } = useNuxtApp();

const loading = ref(false);
const valid = ref(false);
const password = ref('changeme');
const passwordVisible = ref(false);

const passwordRules = computed(() => (value) => !!value || t('required'));

async function tryLogin() {
  loading.value = true;

  try {
    await $fetch('/login', {
      method: 'POST',
      headers: {
        'x-api-key': password.value
      }
    });
  } catch (err) {
    loading.value = false;
    snackStore.error(t('error.administration.invalidPassword'));
    return;
  }

  adminStore.setIsAdmin(true);
  adminStore.setPassword(password.value);
  
  loading.value = false;

  router.push('/administration/elastic')
}

</script>
