export default defineNuxtPlugin(nuxtApp => {
  const baseURL = nuxtApp.$config.public.APIHost; 

  const customFetch = $fetch.create({
    baseURL
  });


  nuxtApp.provide('fetch', customFetch);
});