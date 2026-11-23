import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';
import { createPointTile } from '../src/routes/map/utils/formats/mlt/__fixtures__/point';
import { thumbnailStyle } from '../src/routes/map/utils/image/vector/__fixtures__/thumbnail';
import {
	createTestMvt,
	createTestPmtiles
} from '../src/routes/map/utils/image/vector/__fixtures__/tiles';
import { expect, test } from './map-test';

// Viteのモジュールを直接呼び、各プロトコルと実Workerの接続を検証する。
test('追加したベクター形式を実WorkerでWebPにする', async ({ page }) => {
	test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Viteの開発モジュールを使う結合テスト');
	const mvt = createTestMvt();
	const mlt = createPointTile();
	const archive = createTestPmtiles(mvt);
	const mltArchive = createTestPmtiles(mlt, 6);
	await page.route('**/test-thumbnail*.pmtiles', route => {
		const bytes = route.request().url().includes('-mlt.') ? mltArchive : archive;
		const [start, end] = route.request().headers().range.replace('bytes=', '').split('-').map(
			Number
		);
		return route.fulfill({ status: 206, body: Buffer.from(bytes.slice(start, end + 1)) });
	});
	const source = thumbnailStyle.sources['test-vector'];
	if (source.type !== 'geojson') throw new Error('Invalid fixture');
	await page.route('**/test-feature/**', route => route.fulfill({ json: source.data }));
	const SQL = await initSqlJs({
		locateFile: () => createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')
	});
	const db = new SQL.Database();
	db.run(
		'CREATE TABLE metadata (name TEXT, value TEXT); CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB);'
	);
	db.run('INSERT INTO metadata VALUES (?, ?)', ['format', 'pbf']);
	db.run('INSERT INTO tiles VALUES (0, 0, 0, ?)', [mvt]);
	const mbtiles = Array.from(db.export());
	db.close();
	await page.goto('./', { waitUntil: 'domcontentloaded' });
	const results = await page.evaluate(async ({ mvt, mlt, mbtiles, fixture }) => {
		const moduleRoot = '/src/routes/map/';
		const { generateVectorThumbnail } = await import(
			`${moduleRoot}utils/image/vector/thumbnail-client.ts`
		);
		const { registerLocalMvt } = await import(
			`${moduleRoot}protocol/vector/local-mvt/index.ts`
		);
		const { registerMBTiles, releaseMBTiles } = await import(
			`${moduleRoot}protocol/mbtiles/index.ts`
		);
		const localMvt = registerLocalMvt({
			tiles: new Map([['0/0/0', new File([new Uint8Array(mvt)], 'test.pbf')]])
		});
		const localMlt = registerLocalMvt({
			tiles: new Map([['0/0/0', new File([new Uint8Array(mlt)], 'test.mlt')]])
		});
		await registerMBTiles(
			'test-thumbnail',
			new File([new Uint8Array(mbtiles)], 'test.mbtiles')
		);
		const origin = location.origin;
		const endpoint = `${origin}/test-feature/items`;
		const tileQuery = 'x={x}&y={y}&z={z}';
		const variants = [
			{
				name: 'PMTiles',
				url: `pmtiles://${origin}/test-thumbnail.pmtiles`,
				layer: 'test-features'
			},
			{
				name: 'PMTiles MLT',
				url: `pmtiles://${origin}/test-thumbnail-mlt.pmtiles`,
				layer: 'test-layer'
			},
			{
				name: 'MBTiles',
				tile: 'mbtiles://test-thumbnail/{z}/{x}/{y}',
				layer: 'test-features'
			},
			{ name: 'local MVT', tile: localMvt.url, layer: 'test-features' },
			{ name: 'local MLT', tile: localMlt.url, layer: 'test-layer', encoding: 'mlt' },
			{
				name: 'GeoJSON tile',
				tile: `geojson://${endpoint}?${tileQuery}`,
				layer: 'geojsonLayer'
			},
			{
				name: 'Esri Feature',
				tile: `esri-feature://${endpoint}?${tileQuery}`,
				layer: 'geojsonLayer'
			},
			{
				name: 'OGC Features',
				tile: `ogc-feature://request?src=${
					encodeURIComponent(endpoint)
				}&sourceLayer=geojsonLayer&${tileQuery}`,
				layer: 'geojsonLayer'
			},
			{
				name: 'WFS',
				tile: `wfs-feature://request?serviceUrl=${
					encodeURIComponent(endpoint)
				}&version=2.0.0&typeName=test-layer&sourceLayer=geojsonLayer&${tileQuery}`,
				layer: 'geojsonLayer'
			}
		];
		const results = [];
		try {
			for (const variant of variants) {
				const isMlt = variant.layer === 'test-layer';
				const style = {
					...fixture,
					sources: {
						'test-vector': {
							type: 'vector',
							minzoom: 0,
							maxzoom: 0,
							...(variant.url ? { url: variant.url } : { tiles: [variant.tile] }),
							...(variant.encoding ? { encoding: variant.encoding } : {})
						}
					},
					layers: isMlt
						? [{
							id: 'test-point',
							type: 'circle',
							source: 'test-vector',
							'source-layer': 'test-layer',
							paint: { 'circle-radius': 8, 'circle-color': '#ff0000' }
						}]
						: fixture.layers.map(layer => ({ ...layer, 'source-layer': variant.layer }))
				};
				const url = await generateVectorThumbnail(
					style,
					isMlt ? [-180, -85, 180, 85] : [-3, -3, 3, 3]
				);
				try {
					const blob = await (await fetch(url)).blob();
					const image = await createImageBitmap(blob);
					const canvas = new OffscreenCanvas(image.width, image.height);
					const context = canvas.getContext('2d')!;
					context.drawImage(image, 0, 0);
					const pixels = context.getImageData(0, 0, image.width, image.height).data;
					results.push({
						name: variant.name,
						type: blob.type,
						size: [image.width, image.height],
						painted: pixels.some((v, i) => i % 4 === 3 && v > 0)
					});
					image.close();
				} finally {
					URL.revokeObjectURL(url);
				}
			}
		} finally {
			localMvt.dispose();
			localMlt.dispose();
			releaseMBTiles('test-thumbnail');
		}
		return results;
	}, { mvt: Array.from(mvt), mlt: Array.from(mlt), mbtiles, fixture: thumbnailStyle });
	for (const result of results) {
		expect(result, result.name).toMatchObject({
			type: 'image/webp',
			size: [512, 512],
			painted: true
		});
	}
	expect(results).toHaveLength(9);
	await expect(page.locator('[id^="map-instance-"]')).toHaveCount(0);
});
