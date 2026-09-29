import { SUPPORTED_FILE_ACCEPT, SUPPORTED_UPLOAD_FORMATS } from '$routes/map/types';
import { describe, expect, it } from 'vitest';
import previousLimits from './__fixtures__/resource-limits.json';
import catalog from './__fixtures__/upload-catalog.json';
import { formatE57 } from './e57/definition';
import type { FormatDefinition } from './format-definition';
import { hasFormatExtension } from './format-definition';
import { formatJwc } from './jwc/definition';
import { formatOsmPbf } from './osm-pbf/definition';
import { FORMAT_DEFINITIONS } from './registry';
import { formatSqlDump } from './sqlite/sql-dump-definition';

// 移動前の公開カタログを固定し、既存の選択・並び順・複合拡張子の欠落を検出する。
describe('format definitions', () => {
	it('UIの並び順と各形式の拡張子を維持する', () => {
		expect(SUPPORTED_UPLOAD_FORMATS.map(({ id, extensions }) => ({ id, extensions }))).toEqual(
			catalog
		);
		expect(Object.keys(FORMAT_DEFINITIONS).sort()).toEqual(
			catalog.map(format => format.id).sort()
		);
		for (const [id, definition] of Object.entries(FORMAT_DEFINITIONS)) {
			expect(definition.id).toBe(id);
		}
	});
	it('関連ファイルを含むファイル選択の対応範囲を維持する', () => {
		const sidecars = [
			'.tfw',
			'.tifw',
			'.tiffw',
			'.pgw',
			'.jgw',
			'.j2w',
			'.jp2w',
			'.blw',
			'.bpw',
			'.bqw',
			'.bilw',
			'.bipw',
			'.bsqw',
			'.wld',
			'.aux.xml',
			'.mtl',
			'.bmp',
			'.dds',
			'.gif',
			'.spa',
			'.sph',
			'.tga',
			'.vmd',
			'.vpd'
		];
		const expected = [
			...new Set([...catalog.flatMap(format => format.extensions), ...sidecars])
		].sort();
		expect(SUPPORTED_FILE_ACCEPT.split(',').sort()).toEqual(expected);
	});
	it('既存の制限値を変更せず各定義へ移す', () => {
		const actual = {
			shp: FORMAT_DEFINITIONS.shp.limits,
			dgn: FORMAT_DEFINITIONS.dgn.limits,
			'osm-pbf': formatOsmPbf.limits,
			fit: FORMAT_DEFINITIONS.fit.limits,
			jwc: formatJwc.limits,
			bds: FORMAT_DEFINITIONS.bds.limits,
			gcd: FORMAT_DEFINITIONS.gcd.limits,
			e57: formatE57.limits,
			'mapinfo-tab': FORMAT_DEFINITIONS['mapinfo-tab'].limits,
			jpeg2000: FORMAT_DEFINITIONS.jpeg2000.limits,
			rik: FORMAT_DEFINITIONS.rik.limits,
			mca: FORMAT_DEFINITIONS.mca.limits,
			'envi-bil': FORMAT_DEFINITIONS['envi-bil'].limits,
			cedxm: FORMAT_DEFINITIONS.cedxm.limits,
			'sql-dump': formatSqlDump.limits,
			'local-3dtiles': FORMAT_DEFINITIONS['3dtiles'].limits,
			'local-mvt': FORMAT_DEFINITIONS.vector.limits,
			'local-raster-tiles': FORMAT_DEFINITIONS.raster.limits
		};
		expect(actual).toEqual(previousLimits);
	});
	it('同じUI項目でも別形式に制限を広げない', () => {
		for (
			const group of [
				FORMAT_DEFINITIONS.osm,
				FORMAT_DEFINITIONS.jww,
				FORMAT_DEFINITIONS.sqlite,
				FORMAT_DEFINITIONS.pointcloud
			]
		) {
			expect((group as FormatDefinition).limits).toBeUndefined();
			for (const variant of group.variants) {
				expect(variant.limits).toBeDefined();
				expect(
					variant.extensions.every(ext =>
						(group.extensions as readonly string[]).includes(ext)
					)
				).toBe(true);
			}
		}
		expect(FORMAT_DEFINITIONS.osm.variants[0]).toBe(formatOsmPbf);
	});
	it('複合拡張子と大文字を既存の判定と同じように扱う', () => {
		expect(hasFormatExtension('test-map.OSM.PBF', formatOsmPbf.extensions)).toBe(true);
		expect(hasFormatExtension('test-map.pbf.txt', formatOsmPbf.extensions)).toBe(false);
	});
	it('定義モジュールにはUIやデコーダーを読み込ませない', () => {
		const sources = import.meta.glob<string>([
			'./**/*definition.ts',
			'./registry.ts',
			'./resource-limits.ts'
		], { query: '?raw', import: 'default', eager: true });
		for (const [path, source] of Object.entries(sources)) {
			for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
				expect(match[1], path).toMatch(
					/^\.{1,2}\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]*definition|resource-limits)$/
				);
			}
			expect(source, path).not.toMatch(/\bimport\s*\(/);
		}
	});
});
