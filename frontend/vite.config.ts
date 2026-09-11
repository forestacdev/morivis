import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { qrcode } from 'vite-plugin-qrcode';
import { lazySvelteKitPWA } from './scripts/pwa-precache';
import { buildViteProxyConfig } from './src/routes/map/utils/platform/proxy';

// @devantic/diaper の自動CSSインジェクトを無効化するプラグイン
const diaperCssOverridePlugin: Plugin = {
	name: 'diaper-css-override',
	transform(code, id) {
		if (
			id.includes('@devantic/diaper')
			&& (id.endsWith('diaper.css') || id.endsWith('bottomsheet.css'))
		) {
			return { code: '', map: null };
		}
	}
};

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const lazyPrecacheIgnores = [
		'**/*.wasm',
		'client/_app/immutable/workers/**',
		'client/{draco,basis,rhino3dm,web-ifc,vendor}/**'
	];

	return {
		// Worker-only dependencies must be ready before the first conversion, or Vite
		// reloads the page on discovery and discards the user's uploaded point cloud.
		optimizeDeps: { include: ['three/addons/objects/MarchingCubes.js'] },
		plugins: [
			diaperCssOverridePlugin,
			sveltekit(),
			qrcode(),
			enhancedImages(),
			lazySvelteKitPWA({
				// PWA用の設定
				includeAssets: [
					'favicon.ico',
					'apple-touch-icon-180x180.png',
					'maskable-icon-512x512.png'
				],
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
							src: './images/pwa/screen_wide_1.png',
							sizes: '1280x714',
							type: 'image/png',
							form_factor: 'wide'
						},
						{
							src: './images/pwa/android/screen_1.jpg',
							sizes: '720x1600',
							type: 'image/jpeg',
							form_factor: 'narrow'
						},
						{
							src: './images/pwa/android/screen_2.jpg',
							sizes: '720x1600',
							type: 'image/jpeg',
							form_factor: 'narrow'
						}
						// {
						// 	src: './images/pwa/android/screen_3.webp',
						// 	sizes: '720x1478',
						// 	type: 'image/webp'
						// }
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
					globIgnores: lazyPrecacheIgnores,
					maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
					// ハッシュ付きの追加モジュールは、実際に使用したものだけキャッシュする。
					runtimeCaching: [{
						urlPattern: ({ url, sameOrigin }) =>
							sameOrigin && url.pathname.includes('/_app/immutable/')
							&& /\.(?:[cm]?js|wasm)$/.test(url.pathname),
						handler: 'CacheFirst',
						options: {
							cacheName: 'morivis-lazy-modules',
							expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
							cacheableResponse: { statuses: [200] }
						}
					}]
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
			noExternal: ['svelte-hero-icons', 'maplibre-gl']
		},
		server: {
			allowedHosts: true,
			proxy: buildViteProxyConfig(env)
		},
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
			setupFiles: ['./vitest.setup.ts']
		}
	};
});
