import { defineConfig } from '@vite-pwa/assets-generator/config';

export default defineConfig({
	headLinkOptions: {
		preset: '2023'
	},
	preset: {
		transparent: {
			sizes: [64, 192, 512],
			favicons: [
				[32, 'favicon.ico'],
				[32, 'favicon.png']
			],
			padding: 0,
			resizeOptions: {
				fit: 'contain',
				background: 'transparent'
			}
		},
		maskable: {
			sizes: [512],
			padding: 0.3, // マスカブルアイコン用のパディング
			resizeOptions: {
				fit: 'contain',
				background: '#0c221d'
			}
		},
		apple: {
			sizes: [180],
			padding: 0.3,
			resizeOptions: {
				fit: 'contain',
				background: '#0c221d'
			}
		}
	},
	images: ['static/pwa-icon-origin.svg']
});
