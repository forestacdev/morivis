import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import path from 'path';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		enhancedImages(),
		SvelteKitPWA({
			// PWA用の設定
			includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
			manifest: {
				name: 'morivis',
				background_color: '#0C221D',
				categories: ['navigation'],
				short_name: 'morivis',
				description: '森林文化アカデミー演習林Webマップ',
				screenshots: [
					{
						src: 'screen_1.webp',
						sizes: '720x1478',
						type: 'image/webp'
					},
					{
						src: 'screen_2.webp',
						sizes: '720x1478',
						type: 'image/webp'
					},
					{
						src: 'screen_3.webp',
						sizes: '720x1478',
						type: 'image/webp'
					}
				],
				theme_color: '#0C221D',
				orientation: 'natural',
				start_url: '/morivis/map',
				scope: '/morivis/map',
				lang: 'ja',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					// {
					// 	src: 'pwa-192x192.png',
					// 	sizes: '192x192',
					// 	type: 'image/png',
					// 	purpose: 'maskable'
					// },
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					}
					// {
					// 	src: 'pwa-512x512.png',
					// 	sizes: '512x512',
					// 	type: 'image/png',
					// 	purpose: 'maskable'
					// }
				]
			},
			devOptions: {
				enabled: true
			},
			workbox: {
				maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10MB に拡張
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
	server: {
		proxy: {
			'/api/gsj': {
				target: 'https://tiles.gsj.jp',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/gsj/, '')
			}
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
