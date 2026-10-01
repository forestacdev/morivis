// 任意の再生成用。外部ogr2ogr CLIとそのDGN seedが必要。
// アプリ・テスト・ビルドからは実行しない。
// node frontend/src/routes/map/utils/formats/dgn/__fixtures__/generate.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const fixture = name => fileURLToPath(new URL(name, import.meta.url));
execFileSync('ogr2ogr', ['--version'], { stdio: 'inherit' });
for (const dim of ['2d', '3d']) {
	execFileSync('ogr2ogr', [
		'-overwrite',
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
		'ORIGIN=0,0,0',
		fixture(`test-${dim}.dgn`),
		fixture('test-source.geojson')
	], { stdio: 'inherit' });
}
for (const name of ['test-2d', 'test-3d', 'test-curves']) {
	execFileSync('ogr2ogr', [
		'-overwrite',
		'-f',
		'GeoJSON',
		'-dim',
		'XY',
		fixture(`${name}.expected.json`),
		fixture(`${name}.dgn`)
	], { stdio: 'inherit' });
}
