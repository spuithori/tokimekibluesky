import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import { vite as vidstack } from 'vidstack/plugins';

export default defineConfig({
	define: {
		'process.env.NODE_ENV': process.env.NODE_ENV === 'production'
			? '"production"'
			: '"development"'
	},

	plugins: [
		vidstack({ include: /src\/lib\/components\/video\// }),
		sveltekit(),
		SvelteKitPWA({
			srcDir: 'src',
			mode: 'production',
			strategies: 'injectManifest',
			filename: 'sw.ts',
			manifest: {
				name: 'TOKIMEKI',
				short_name: 'TOKIMEKI',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				description: 'Bluesky web app',
				theme_color: '#ffffff',
				icons: [
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				],
				share_target: {
					"action": "/shared",
					"method": "GET",
					"enctype": "application/x-www-form-urlencoded",
					"params": {
						"title": "title",
						"text": "text",
						"url": "url"
					}
				}
			},
			devOptions: {
				enabled: true,
				type: 'module',
				navigateFallback: '/',
			},
		}),
	]
});
