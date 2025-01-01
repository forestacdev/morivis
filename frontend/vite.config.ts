import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit(), enhancedImages()],
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
