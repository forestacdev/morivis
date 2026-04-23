import { defineConfig, type Plugin } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import path from 'path';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { qrcode } from 'vite-plugin-qrcode';
import { buildViteProxyConfig } from './src/routes/map/utils/platform/proxy';

// @devantic/diaper の自動CSSインジェクトを無効化するプラグイン
const diaperCssOverridePlugin: Plugin = {
	name: 'diaper-css-override',
	transform(code, id) {
		if (
			id.includes('@devantic/diaper') &&
			(id.endsWith('diaper.css') || id.endsWith('bottomsheet.css'))
		) {
			return { code: '', map: null };
		}
	}
};

export default defineConfig({
	plugins: [
		// diaperCssOverridePlugin,
		sveltekit(),
		qrcode(),
		enhancedImages(),
		SvelteKitPWA({
			// PWA用の設定
			includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
			showMaximumFileSizeToCacheInBytesWarning: true,
			manifest: {
				name: 'morivis',
				display: 'fullscreen',
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
	worker: {
		format: 'es'
	},
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
		allowedHosts: true,
		proxy: buildViteProxyConfig()
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
