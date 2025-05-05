import Papa from 'papaparse';

import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

import type { ParseResult } from 'papaparse';
import { showNotification } from '$routes/store/notification';

/**
 * CSVファイルから読み込んだデータをGeoJSON形式に変換する
 * @param {File} csv - CSVファイル
 * @returns {any} - GeoJSON形式のデータ
 */
export const csvFileToGeojson = (
	csv: File
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	return new Promise((resolve, reject) => {
		Papa.parse(csv, {
			complete: (results: ParseResult<Record<string, string | number>>) => {
				const json = results.data.filter(
					(item: Record<string, string | number>) => item.lat != null && item.lon != null
				);

				if (json.length === 0) {
					showNotification('CSVに緯度経度のデータがありません。', 'error');
					// error
					reject(new Error('Latitude and longitude data are missing'));
					return;
				}
				if (json.length > 100000) {
					showNotification('10万件以上のデータは表示できません。', 'error');
					reject(new Error('Data of more than 100,000 entries cannot be displayed.'));
					return;
				}
				const geojson = {
					type: 'FeatureCollection',
					features: json.map((item) => {
						return {
							type: 'Feature',
							properties: item,
							geometry: {
								type: 'Point',
								coordinates: [item.lon, item.lat]
							}
						};
					})
				};
				resolve(geojson as FeatureCollection<Geometry, GeoJsonProperties>);
			},
			header: true // CSV の最初の行をフィールド名として使用
		});
	});
};
