import { defineNuxtPlugin } from '#imports';

export default defineNuxtPlugin((nuxtApp) => {
  const baseURL = nuxtApp.$config.public.API_URL;

  const customFetch = $fetch.create({
    baseURL,
  });
  customFetch.baseURL = baseURL;

  nuxtApp.provide('fetch', customFetch);
});
