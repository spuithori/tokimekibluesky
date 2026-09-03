import vercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const adapter = vercel;

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
