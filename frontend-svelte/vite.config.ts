import { sveltekit } from '@sveltejs/kit/vite';
import glsl from 'vite-plugin-glsl';
import glslify from 'vite-plugin-glslify';
import { defineConfig } from 'vite';
// import svg from '@poppanator/sveltekit-svg';

export default defineConfig({
	plugins: [sveltekit(), glsl(), glslify()],
	server: {
		host: true
	}
});
