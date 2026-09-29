// 架空の図形から、同梱GDALのseedを使ってV7 DGNを生成する。
// リポジトリのルートで node frontend/src/routes/map/utils/formats/dgn/__fixtures__/generate.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import init from 'gdal3.js/node.js';
global.fetch = undefined;
const fixture = (name) => fileURLToPath(new URL(name, import.meta.url));
const source = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { Level: 1, ColorIndex: 3, Text: 'test-label' },
			geometry: { type: 'Point', coordinates: [2, 3, 4] }
		},
		{
			type: 'Feature',
			properties: { Level: 2, ColorIndex: 4, Weight: 2 },
			geometry: {
				type: 'LineString',
				coordinates: [
					[0, 0, 1],
					[10, 20, 2],
					[30, 10, 3]
				]
			}
		},
		{
			type: 'Feature',
			properties: { Level: 3, ColorIndex: 5 },
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[0, 0, 0],
						[10, 0, 0],
						[10, 10, 0],
						[0, 10, 0],
						[0, 0, 0]
					]
				]
			}
		}
	]
};
writeFileSync(fixture('test-source.geojson'), JSON.stringify(source, null, 2) + '\n');
const gdal = await init({
	path: 'frontend/node_modules/gdal3.js/dist/package',
	dest: 'frontend/.svelte-kit/dgn-fixtures',
	useWorker: false
});
for (const dim of ['2d', '3d']) {
	const { datasets } = await gdal.open(fixture('test-source.geojson'));
	try {
		const output = await gdal.ogr2ogr(
			datasets[0],
			[
				'-f',
				'DGN',
				'-dsco',
				`3D=${dim === '3d' ? 'YES' : 'NO'}`,
				'-dsco',
				'MASTER_UNIT_NAME=m',
				'-dsco',
				'SUB_UNIT_NAME=cm',
				'-dsco',
				'SUB_UNITS_PER_MASTER_UNIT=100',
				'-dsco',
				'UOR_PER_SUB_UNIT=100',
				'-dsco',
				'ORIGIN=0,0,0'
			],
			`test-${dim}`
		);
		writeFileSync(fixture(`test-${dim}.dgn`), await gdal.getFileBytes(output));
	} finally {
		for (const dataset of datasets) await gdal.close(dataset);
	}
}
