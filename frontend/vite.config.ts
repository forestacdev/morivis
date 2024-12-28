import { sveltekit } from '@sveltejs/kit/vite';
// import glsl from 'vite-plugin-glsl';
import glsl from 'vite-plugin-glslify-inject';
import { defineConfig } from 'vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
// import svg from '@poppanator/sveltekit-svg';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit(), glsl(), enhancedImages()],
	resolve: {
		alias: {
			$routes: path.resolve('./src/routes')
		}
	}
	// server: {
	// 	host: true
	// }
});
