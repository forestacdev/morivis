import Papa from 'papaparse';

import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

import type { ParseResult } from 'papaparse';
import { showNotification } from '$routes/stores/notification';

/**
 * CSVファイルから読み込んだデータをGeoJSON形式に変換する
 * @param csv - CSVファイル
 * @param latColumn - 緯度のカラム名
 * @param lonColumn - 経度のカラム名
 * @returns GeoJSON形式のデータ
 */
export const csvFileToGeojson = (
	csv: File,
	latColumn: string,
	lonColumn: string
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	return new Promise((resolve, reject) => {
		Papa.parse(csv, {
			complete: (results: ParseResult<Record<string, string | number>>) => {
				// 指定されたカラムが存在するかチェック
				const headers = results.meta.fields || [];
				if (!headers.includes(latColumn)) {
					const message = `指定された緯度カラム '${latColumn}' が見つかりません。`;
					showNotification(message, 'error');
					reject(new Error(`Latitude column '${latColumn}' not found`));
					return;
				}
				if (!headers.includes(lonColumn)) {
					const message = `指定された経度カラム '${lonColumn}' が見つかりません。`;
					showNotification(message, 'error');
					reject(new Error(`Longitude column '${lonColumn}' not found`));
					return;
				}

				// 緯度・経度データがある行のみフィルタリング
				const json = results.data.filter(
					(item: Record<string, string | number>) =>
						item[latColumn] != null &&
						item[lonColumn] != null &&
						item[latColumn] !== '' &&
						item[lonColumn] !== ''
				);

				if (json.length === 0) {
					showNotification('CSVに有効な緯度経度のデータがありません。', 'error');
					reject(new Error('No valid latitude and longitude data found'));
					return;
				}
				if (json.length > 100000) {
					showNotification('10万件以上のデータは表示できません。', 'error');
					reject(new Error('Data of more than 100,000 entries cannot be displayed.'));
					return;
				}

				// 座標値の変換と検証
				const features: Feature<Geometry, GeoJsonProperties>[] = [];
				const invalidRows: number[] = [];

				json.forEach((item, index) => {
					const lat = Number(item[latColumn]);
					const lon = Number(item[lonColumn]);

					// 座標値の妥当性チェック
					if (isNaN(lat) || isNaN(lon)) {
						invalidRows.push(index + 1);
						return;
					}
					if (lat < -90 || lat > 90) {
						invalidRows.push(index + 1);
						return;
					}
					if (lon < -180 || lon > 180) {
						invalidRows.push(index + 1);
						return;
					}

					features.push({
						type: 'Feature',
						properties: item,
						geometry: {
							type: 'Point',
							coordinates: [lon, lat] // GeoJSONでは [経度, 緯度] の順序
						}
					});
				});

				// 無効な行がある場合の警告
				if (invalidRows.length > 0) {
					const message = `${invalidRows.length}行の無効な座標データをスキップしました。`;
					showNotification(message, 'warning');
				}

				if (features.length === 0) {
					showNotification('有効な座標データがありません。', 'error');
					reject(new Error('No valid coordinate data found'));
					return;
				}

				const geojson: FeatureCollection<Geometry, GeoJsonProperties> = {
					type: 'FeatureCollection',
					features
				};

				resolve(geojson);
			},
			header: true, // CSV の最初の行をフィールド名として使用
			dynamicTyping: true, // 数値を自動的に数値型に変換
			skipEmptyLines: true // 空行をスキップ
		});
	});
};

/**
 * CSVファイルのヘッダー情報を取得する
 * @param file - CSVファイル
 * @returns Promise<string[]> - カラム名の配列
 */
export const getCSVHeaders = (file: File): Promise<string[]> => {
	return new Promise((resolve, reject) => {
		Papa.parse(file, {
			header: true,
			preview: 1, // 1行だけプレビューしてヘッダーを取得
			complete: (results) => {
				if (results.errors.length > 0) {
					reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
					return;
				}

				const headers = results.meta.fields || [];
				resolve(headers);
			},
			error: (error) => {
				reject(new Error(`Failed to read CSV file: ${error.message}`));
			}
		});
	});
};

/**
 * GeoJSONデータをCSV形式に変換する
 * @param geojson - GeoJSONデータ
 * @param options - 変換オプション
 * @returns CSV文字列
 */
export interface GeojsonToCsvOptions {
	latColumn?: string;
	lonColumn?: string;
	includeGeometry?: boolean;
	flattenProperties?: boolean;
	customColumns?: Record<string, (feature: Feature) => any>;
}

export const geojsonToCSV = (
	geojson: FeatureCollection<Geometry, GeoJsonProperties>,
	options: GeojsonToCsvOptions = {}
): string => {
	const {
		latColumn = 'lat',
		lonColumn = 'lon',
		includeGeometry = false,
		flattenProperties = true,
		customColumns = {}
	} = options;

	if (!geojson.features || geojson.features.length === 0) {
		throw new Error('GeoJSON contains no features');
	}

	const rows: Record<string, any>[] = [];

	geojson.features.forEach((feature, index) => {
		const row: Record<string, any> = {};

		// プロパティの追加
		if (feature.properties) {
			if (flattenProperties) {
				// ネストしたオブジェクトをフラット化
				Object.entries(feature.properties).forEach(([key, value]) => {
					if (typeof value === 'object' && value !== null) {
						// オブジェクトの場合は文字列化
						row[key] = JSON.stringify(value);
					} else {
						row[key] = value;
					}
				});
			} else {
				Object.assign(row, feature.properties);
			}
		}

		// 座標の追加
		if (feature.geometry) {
			switch (feature.geometry.type) {
				case 'Point':
					const [lon, lat] = feature.geometry.coordinates as [number, number];
					row[lonColumn] = lon;
					row[latColumn] = lat;
					break;
				case 'LineString':
				case 'MultiPoint':
					// 最初の座標を使用
					const [firstLon, firstLat] = feature.geometry.coordinates[0] as [number, number];
					row[lonColumn] = firstLon;
					row[latColumn] = firstLat;
					break;
				case 'Polygon':
				case 'MultiLineString':
					// 最初の座標を使用
					const [polyLon, polyLat] = feature.geometry.coordinates[0][0] as [number, number];
					row[lonColumn] = polyLon;
					row[latColumn] = polyLat;
					break;
				case 'MultiPolygon':
					// 最初の座標を使用
					const [multiLon, multiLat] = feature.geometry.coordinates[0][0][0] as [number, number];
					row[lonColumn] = multiLon;
					row[latColumn] = multiLat;
					break;
			}

			// ジオメトリ情報を含める場合
			if (includeGeometry) {
				row.geometry_type = feature.geometry.type;
				row.geometry_coordinates = JSON.stringify(feature.geometry.coordinates);
			}
		}

		// カスタムカラムの追加
		Object.entries(customColumns).forEach(([columnName, valueFunction]) => {
			try {
				row[columnName] = valueFunction(feature);
			} catch (error) {
				console.warn(`Error processing custom column ${columnName}:`, error);
				row[columnName] = null;
			}
		});

		rows.push(row);
	});

	// CSVに変換
	const csv = Papa.unparse(rows, {
		header: true,
		skipEmptyLines: true
	});

	return csv;
};

/**
 * GeoJSONデータをCSVファイルとしてダウンロードする
 * @param geojson - GeoJSONデータ
 * @param filename - ファイル名
 * @param options - 変換オプション
 */
export const downloadGeojsonAsCSV = (
	geojson: FeatureCollection<Geometry, GeoJsonProperties>,
	filename: string,
	options: GeojsonToCsvOptions = {}
): void => {
	try {
		const csv = geojsonToCSV(geojson, options);

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(link.href);

		showNotification(`${filename}をダウンロードしました。`, 'success');
	} catch (error) {
		console.error('CSV download failed:', error);
		showNotification('CSVのダウンロードに失敗しました。', 'error');
	}
};

/**
 * GeoJSONデータから特定のプロパティのみを抽出してCSVに変換する
 * @param geojson - GeoJSONデータ
 * @param selectedProperties - 抽出するプロパティ名の配列
 * @param options - 変換オプション
 * @returns CSV文字列
 */
export const geojsonToCSVWithSelectedProperties = (
	geojson: FeatureCollection<Geometry, GeoJsonProperties>,
	selectedProperties: string[],
	options: GeojsonToCsvOptions = {}
): string => {
	const { latColumn = 'lat', lonColumn = 'lon', includeGeometry = false } = options;

	if (!geojson.features || geojson.features.length === 0) {
		throw new Error('GeoJSON contains no features');
	}

	const rows: Record<string, any>[] = [];

	geojson.features.forEach((feature) => {
		const row: Record<string, any> = {};

		// 選択されたプロパティのみを追加
		if (feature.properties) {
			selectedProperties.forEach((prop) => {
				if (prop in feature.properties!) {
					row[prop] = feature.properties![prop];
				}
			});
		}

		// 座標の追加
		if (feature.geometry && feature.geometry.type === 'Point') {
			const [lon, lat] = feature.geometry.coordinates as [number, number];
			row[lonColumn] = lon;
			row[latColumn] = lat;
		}

		// ジオメトリ情報を含める場合
		if (includeGeometry && feature.geometry) {
			row.geometry_type = feature.geometry.type;
			row.geometry_coordinates = JSON.stringify(feature.geometry.coordinates);
		}

		rows.push(row);
	});

	const csv = Papa.unparse(rows, {
		header: true,
		skipEmptyLines: true
	});

	return csv;
};

/**
 * GeoJSONデータの統計情報を取得する
 * @param geojson - GeoJSONデータ
 * @returns 統計情報オブジェクト
 */
export const getGeojsonStats = (geojson: FeatureCollection<Geometry, GeoJsonProperties>) => {
	if (!geojson.features || geojson.features.length === 0) {
		return { totalFeatures: 0, geometryTypes: {}, properties: {} };
	}

	const stats = {
		totalFeatures: geojson.features.length,
		geometryTypes: {} as Record<string, number>,
		properties: {} as Record<string, { count: number; uniqueValues: number; nullCount: number }>
	};

	// 全プロパティを収集
	const allProperties = new Set<string>();
	geojson.features.forEach((feature) => {
		if (feature.properties) {
			Object.keys(feature.properties).forEach((prop) => allProperties.add(prop));
		}
	});

	// プロパティの統計を初期化
	allProperties.forEach((prop) => {
		stats.properties[prop] = { count: 0, uniqueValues: 0, nullCount: 0 };
	});

	geojson.features.forEach((feature) => {
		// ジオメトリタイプの統計
		if (feature.geometry) {
			const geomType = feature.geometry.type;
			stats.geometryTypes[geomType] = (stats.geometryTypes[geomType] || 0) + 1;
		}

		// プロパティの統計
		if (feature.properties) {
			allProperties.forEach((prop) => {
				const value = feature.properties![prop];
				if (value !== null && value !== undefined) {
					stats.properties[prop].count++;
				} else {
					stats.properties[prop].nullCount++;
				}
			});
		} else {
			allProperties.forEach((prop) => {
				stats.properties[prop].nullCount++;
			});
		}
	});

	// ユニーク値の数を計算
	allProperties.forEach((prop) => {
		const uniqueValues = new Set(
			geojson.features
				.map((feature) => feature.properties?.[prop])
				.filter((value) => value !== null && value !== undefined)
		);
		stats.properties[prop].uniqueValues = uniqueValues.size;
	});

	return stats;
};

/**
 * 使用例
 */
/*
// 基本的な使用
const csv = geojsonToCSV(geojsonData);

// オプション付き
const csv = geojsonToCSV(geojsonData, {
  latColumn: 'latitude',
  lonColumn: 'longitude',
  includeGeometry: true,
  flattenProperties: true,
  customColumns: {
    'full_address': (feature) => `${feature.properties?.city}, ${feature.properties?.country}`,
    'coordinate_string': (feature) => {
      if (feature.geometry?.type === 'Point') {
        const [lon, lat] = feature.geometry.coordinates as [number, number];
        return `${lat},${lon}`;
      }
      return '';
    }
  }
});

// ダウンロード
downloadGeojsonAsCSV(geojsonData, 'locations.csv', {
  latColumn: 'latitude',
  lonColumn: 'longitude'
});

// 特定のプロパティのみ抽出
const csvWithSelectedProps = geojsonToCSVWithSelectedProperties(
  geojsonData,
  ['name', 'category', 'population'],
  { latColumn: 'lat', lonColumn: 'lng' }
);

// 統計情報の取得
const stats = getGeojsonStats(geojsonData);
console.log('Statistics:', stats);
*/
