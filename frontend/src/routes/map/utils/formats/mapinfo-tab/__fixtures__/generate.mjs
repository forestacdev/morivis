// 架空の座標・属性だけからGDALでNative TAB一式を作る。
// リポジトリのルートで node frontend/src/routes/map/utils/formats/mapinfo-tab/__fixtures__/generate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const fixtureDir = fileURLToPath(new URL('.', import.meta.url));
import init from 'gdal3.js/node.js';
global.fetch = undefined;
const run = async () => {
	const gdal = await init({
		path: 'frontend/node_modules/gdal3.js/dist/package',
		useWorker: false
	});
	const source = {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties: { name: '架空ポイント', value: 12.5, enabled: true },
				geometry: { type: 'Point', coordinates: [2.5, 1.25] }
			},
			{
				type: 'Feature',
				properties: { name: 'test-line', value: -2, enabled: false },
				geometry: { type: 'LineString', coordinates: [[2.5, 1.25], [2.502, 1.252]] }
			},
			{
				type: 'Feature',
				properties: { name: 'test-region', value: 0, enabled: true },
				geometry: {
					type: 'Polygon',
					coordinates: [[[2.5, 1.25], [2.504, 1.25], [2.504, 1.254], [2.5, 1.254], [
						2.5,
						1.25
					]], [[2.501, 1.251], [2.501, 1.252], [2.502, 1.252], [2.502, 1.251], [
						2.501,
						1.251
					]]]
				}
			}
		]
	};
	fs.writeFileSync(
		path.join(fixtureDir, 'test-source.geojson'),
		JSON.stringify(source, null, 2) + '\n'
	);
	for (
		const [name, options] of [
			['test-native', ['-a_srs', 'EPSG:4326', '-dsco', 'ENCODING=CP932']],
			['test-point', [
				'-where',
				"name = '架空ポイント'",
				'-a_srs',
				'EPSG:4326',
				'-dsco',
				'ENCODING=CP932'
			]],
			['test-projected', ['-t_srs', 'EPSG:3857', '-dsco', 'ENCODING=CP932']],
			['test-local', [
				'-a_srs',
				'NONE',
				'-dsco',
				'ENCODING=CP932',
				'-lco',
				'BOUNDS=-10,-10,10,10'
			]]
		]
	) {
		// ogr2ogrの属性フィルターが次のfixtureへ残らないよう、毎回開き直す。
		const { datasets } = await gdal.open(path.join(fixtureDir, 'test-source.geojson'));
		const output = await gdal.ogr2ogr(datasets[0], ['-f', 'MapInfo File', ...options], name);
		for (const file of output.all) {
			fs.writeFileSync(
				path.join(fixtureDir, path.basename(file.local)),
				await gdal.getFileBytes(file)
			);
		}
		await gdal.close(datasets[0]);
	}
	const tab = (await gdal.open(path.join(fixtureDir, 'test-native.tab'))).datasets[0];
	console.log('Generated synthetic Native TAB fixtures');
	await gdal.close(tab);
};
run().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
