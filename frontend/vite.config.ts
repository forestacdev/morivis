import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit(), enhancedImages()],
	resolve: {
		alias: {
			$routes: path.resolve('./src/routes')
		}
	},
	// server: {
	// 	host: true
	// }
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
