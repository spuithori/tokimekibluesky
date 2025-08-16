import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { vite as vidstack } from 'vidstack/plugins';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
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
        paraglideVitePlugin({
            project: './project.inlang',
            outdir: './src/lib/paraglide',
            strategy: ['cookie', 'baseLocale'],
        }),
		// visualizer(),
	],

	experimental: {
		enableNativePlugin: true,
	},
});
