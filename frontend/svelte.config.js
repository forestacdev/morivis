import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	// compilerOptions: {
	// 	runes: true
	// },

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		paths: {
			base: process.argv.includes('dev') ? '' : '/morivis'
		},
		alias: {
			$routes: 'src/routes',
			'$routes/*': 'src/routes/*',
			$map: 'src/routes/map',
			'$map/*': 'src/routes/map/*'
		}
	}
};

export default config;
