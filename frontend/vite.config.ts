import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		enhancedImages(),
		VitePWA({
			// PWA用の設定
			includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
			manifest: {
				name: '森林文化アカデミー演習林GIS',
				short_name: '演習林GIS',
				description: '森林文化アカデミーの演習林の地図アプリです。',
				theme_color: '#369c00',
				lang: 'ja',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			devOptions: {
				enabled: true
			}
		})
	],
	resolve: {
		alias: {
			$map: path.resolve('./src/routes/map'),
			$routes: path.resolve('./src/routes')
		}
	},
	ssr: {
		noExternal: ['svelte-hero-icons']
	},
	// server: {
	// 	host: true
	// }
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
