import adapter from '@sveltejs/adapter-vercel';
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
      pollInterval: 60_000,
    },
  },

  plugins: {

  },
};

export default config;
