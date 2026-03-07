import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
// import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const allowedHosts = process.env.NODE_ENV === 'development' ? [
		env.ALLOWED_HOST,
	] : undefined;

	return {
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
				external: [
					'@tanstack/svelte-virtual',
					'virtua/svelte',
					'better-sqlite3',
				],
				optimization: {
					inlineConst: true,
				},
			},
		},

		ssr: {
			noExternal: ['tokimeki-video-player', 'hls.js', 'embla-carousel-wheel-gestures', 'wheel-gestures'],
		},

		server: {
			allowedHosts,
		},
	}
});
