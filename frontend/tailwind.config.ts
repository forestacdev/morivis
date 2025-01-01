import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		// 色の定義
		colors: {
			base: '#242424',
			main: '#299413',
			accent: '#02bfe0'
		},
		extend: {
			textColor: {
				primary: '#e9e9e9' // デフォルトにしたい色を指定
			}
		}
	},

	plugins: [typography]
} satisfies Config;
