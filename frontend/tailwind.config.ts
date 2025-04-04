import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			// 色の定義
			colors: {
				base: '#e9e9e9',
				main: '#282828',
				accent: '#23a209'
			},
			fontFamily: {
				noto: ['Noto Sans JP']
			},
			textColor: {
				primary: '#e9e9e9' // デフォルトにしたい色を指定
			}
		}
	},

	plugins: [typography]
} satisfies Config;
