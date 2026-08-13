import { describe, expect, it } from 'vitest';
import { resolveStaticAssetBasePath } from './asset-path';

describe('resolveStaticAssetBasePath', () => {
	it('SvelteKit の build chunk URL から base path を復元できる', () => {
		expect(
			resolveStaticAssetBasePath(
				'https://example.com/morivis/_app/immutable/chunks/app.js',
				'./'
			)
		).toBe('/morivis');
	});

	it('worker URL から base path を復元できる', () => {
		expect(
			resolveStaticAssetBasePath(
				'https://example.com/morivis/_app/immutable/workers/gpkg.worker.js',
				'./'
			)
		).toBe('/morivis');
	});

	it('build chunk でない場合は configured base を使う', () => {
		expect(
			resolveStaticAssetBasePath('http://localhost:5173/src/routes/map/utils/platform/asset-path.ts', '')
		).toBe('');

		expect(
			resolveStaticAssetBasePath(
				'https://example.com/src/routes/map/utils/platform/asset-path.ts',
				'/morivis/'
			)
		).toBe('/morivis');
	});
});
