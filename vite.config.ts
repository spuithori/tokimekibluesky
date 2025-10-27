import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
// import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
	define: {
		'process.env.NODE_ENV': process.env.NODE_ENV === 'production'
			? '"production"'
			: '"development"'
	},

	plugins: [
		sveltekit(),
		// visualizer(),
	],

	experimental: {
		enableNativePlugin: true,
	},

	build: {
		rollupOptions: {
			optimization: {
				inlineConst: process.env.NODE_ENV === 'production',
			},
		},
	},
});
