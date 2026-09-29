// 任意の再生成用。外部ogr2ogr CLIが必要。アプリ・テスト・ビルドからは実行しない。
// node frontend/src/routes/map/utils/formats/mapinfo-tab/__fixtures__/generate.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const fixture = name => fileURLToPath(new URL(name, import.meta.url));
execFileSync('ogr2ogr', ['--version'], { stdio: 'inherit' });
for (
	const [name, source, options] of [
		['test-native', 'test-source.geojson', ['-a_srs', 'EPSG:4326', '-dsco', 'ENCODING=CP932']],
		['test-point', 'test-source.geojson', [
			'-where',
			"name = '架空ポイント'",
			'-a_srs',
			'EPSG:4326',
			'-dsco',
			'ENCODING=CP932'
		]],
		['test-projected', 'test-source.geojson', [
			'-t_srs',
			'EPSG:3857',
			'-dsco',
			'ENCODING=CP932'
		]],
		['test-local', 'test-source.geojson', [
			'-a_srs',
			'NONE',
			'-dsco',
			'ENCODING=CP932',
			'-lco',
			'BOUNDS=-10,-10,10,10'
		]],
		['test-shapes', 'test-shapes.mif', ['-a_srs', 'EPSG:4326']],
		['test-blocks', 'test-blocks.geojson', ['-a_srs', 'EPSG:4326']]
	]
) {
	execFileSync('ogr2ogr', [
		'-overwrite',
		'-f',
		'MapInfo File',
		...options,
		fixture(`${name}.tab`),
		fixture(source)
	], { stdio: 'inherit' });
	if (name !== 'test-point') {
		execFileSync('ogr2ogr', [
			'-overwrite',
			'-f',
			'GeoJSON',
			'-dim',
			'XY',
			fixture(`${name}.expected.json`),
			fixture(`${name}.tab`)
		], { stdio: 'inherit' });
	}
}
