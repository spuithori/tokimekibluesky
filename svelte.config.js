import vercel from '@sveltejs/adapter-vercel';
import cloudflare from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const adapter = process.env.CF_PAGES || process.env.WORKERS_CI
  ? cloudflare
  : vercel;

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
