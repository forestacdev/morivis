import { defineConfig } from '@vite-pwa/assets-generator/config';

export default defineConfig({
	preset: {
		transparent: {
			sizes: [64, 192, 512],
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
