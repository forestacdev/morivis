import { sveltekit } from '@sveltejs/kit/vite';
// import glsl from 'vite-plugin-glsl';
import glsl from 'vite-plugin-glslify-inject';
import { defineConfig } from 'vite';
// import svg from '@poppanator/sveltekit-svg';

export default defineConfig({
	plugins: [sveltekit(), glsl()],
	server: {
		host: true
	}
});
