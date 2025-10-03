import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { vite as vidstack } from 'vidstack/plugins';
// import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
	define: {
		'process.env.NODE_ENV': process.env.NODE_ENV === 'production'
			? '"production"'
			: '"development"'
	},

	plugins: [
		vidstack({ include: /src\/lib\/components\/video\// }),
		sveltekit(),
		// visualizer(),
	],

	experimental: {
		enableNativePlugin: true,
	},

	/* build: {
		rollupOptions: {
			optimization: {
				inlineConst: true,
			},
		},
	}, */
});
