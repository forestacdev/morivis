import { describe, expect, it } from 'vitest';

import {
	getGeometryColumnsForTable,
	isExcludedSqliteTableName,
	parseGeometryColumnsRows,
	resolveSqliteColumnName
} from './schema';

describe('parseGeometryColumnsRows', () => {
	it('GeoPackage 風の geometry_columns を読める', () => {
		const geometryColumnsMap = parseGeometryColumnsRows(
			[
				'f_table_name',
				'f_geometry_column',
				'geometry_type',
				'coord_dimension',
				'srid',
				'geometry_format'
			],
			[['all_day__georss', 'GEOMETRY', 1, 2, 4326, 'WKB']]
		);

		expect(getGeometryColumnsForTable(geometryColumnsMap, 'all_day__georss')).toEqual([
			{
				columnName: 'GEOMETRY',
				geometryType: 1,
				srid: 4326,
				geometryFormat: 'WKB'
			}
		]);
	});

	it('legacy SpatiaLite の type 列を geometry_type に正規化できる', () => {
		const geometryColumnsMap = parseGeometryColumnsRows(
			[
				'f_table_name',
				'f_geometry_column',
				'type',
				'coord_dimension',
				'srid',
				'spatial_index_enabled'
			],
			[
				['roads', 'geometry', 'LINESTRING', 'XY', 4326, 1],
				['buildings', 'Geometry', 'MULTIPOLYGON', 'XYZM', 6677, 0]
			]
		);

		expect(getGeometryColumnsForTable(geometryColumnsMap, 'roads')).toEqual([
			{
				columnName: 'geometry',
				geometryType: 2,
				srid: 4326,
				geometryFormat: 'SpatiaLite'
			}
		]);
		expect(getGeometryColumnsForTable(geometryColumnsMap, 'BUILDINGS')).toEqual([
			{
				columnName: 'Geometry',
				geometryType: 3006,
				srid: 6677,
				geometryFormat: 'SpatiaLite'
			}
		]);
	});
});

describe('isExcludedSqliteTableName', () => {
	it('SpatiaLite の内部テーブルを除外できる', () => {
		expect(isExcludedSqliteTableName('geometry_columns')).toBe(true);
		expect(isExcludedSqliteTableName('idx_all_day__georss_GEOMETRY')).toBe(true);
		expect(isExcludedSqliteTableName('SpatialIndex')).toBe(true);
		expect(isExcludedSqliteTableName('all_day__georss')).toBe(false);
	});
});

describe('resolveSqliteColumnName', () => {
	it('大文字小文字が違っても実カラム名を解決できる', () => {
		expect(resolveSqliteColumnName(['ogc_fid', 'GEOMETRY', 'title'], 'geometry')).toBe(
			'GEOMETRY'
		);
		expect(resolveSqliteColumnName(['geometry'], 'GEOMETRY')).toBe('geometry');
		expect(resolveSqliteColumnName(['id', 'name'], 'geometry')).toBeNull();
	});
});
