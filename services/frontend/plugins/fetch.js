import { defineNuxtPlugin } from '#imports';

export default defineNuxtPlugin((nuxtApp) => {
  const baseURL = nuxtApp.$config.public.APIURL;

  const customFetch = $fetch.create({
    baseURL,
  });

  nuxtApp.provide('fetch', customFetch);
});
