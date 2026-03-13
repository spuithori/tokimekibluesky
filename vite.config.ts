import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import posthog from '@posthog/rollup-plugin';
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
			posthog({
				personalApiKey: env.POSTHOG_PERSONAL_KEY,
				projectId: env.PUBLIC_POSTHOG_PROJECT_ID,
				sourcemaps: {
					enabled: true,
					deleteAfterUpload: true,
				},
			}),
			// visualizer(),
		],

		experimental: {
			enableNativePlugin: true,
		},

		build: {
			rollupOptions: {
				optimization: {
					inlineConst: true,
				},
			},
		},

		server: {
			allowedHosts,
		},
	}
});
