import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    vitePreprocess({
      postcss: true,
    }),
  ],

  kit: {
    adapter: adapter(),
    version: {
      pollInterval: 3_600_000,
    },
  },

  plugins: {

  },
};

export default config;
