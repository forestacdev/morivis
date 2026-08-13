/**
 * Format spec:
 * - https://datatracker.ietf.org/doc/html/rfc4180
 *
 * References:
 * - https://www.papaparse.com/docs
 */
import Encoding from 'encoding-japanese';
import Papa from 'papaparse';

import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import { type TabularPreview, tabularRowsToGeojson } from '$routes/map/utils/formats/tabular';
import { showNotification } from '$routes/stores/notification';
import type { ParseResult } from 'papaparse';

export interface DelimitedTextOptions {
	delimiter?: string;
	sourceName?: string;
}

/**
 * CSVファイルのバイナリからエンコードを検出しUTF-8文字列に変換する
 * @param file - CSVファイル
 * @returns UTF-8にデコードされた文字列
 */
export const readCsvAsUtf8 = async (file: File): Promise<string> => {
	const buffer = await file.arrayBuffer();
	const uint8 = new Uint8Array(buffer);
	const detected = Encoding.detect(uint8);
	const unicodeArray = Encoding.convert(uint8, {
		to: 'UNICODE',
		from: detected || 'AUTO'
	});
	return Encoding.codeToString(unicodeArray);
};

export const readDelimitedTextAsUtf8 = readCsvAsUtf8;

/**
 * CSVファイルのヘッダー情報をエンコード自動判定で取得する
 * @param file - CSVファイル
 * @returns Promise<string[]> - カラム名の配列
 */
export const getCSVHeadersWithEncoding = async (file: File): Promise<string[]> => {
	const text = await readCsvAsUtf8(file);
	return new Promise((resolve, reject) => {
		Papa.parse(text, {
			header: true,
			preview: 1,
			complete: (results) => {
				if (results.errors.length > 0) {
					reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
					return;
				}
				resolve(results.meta.fields || []);
			},
			error: (error: Error) => {
				reject(new Error(`Failed to read CSV file: ${error.message}`));
			}
		});
	});
};

export type CSVPreview = TabularPreview;

/**
 * UTF-8変換済みCSVテキストからヘッダーとプレビュー行を取得する
 * @param text - UTF-8テキスト
 * @param previewRows - プレビューする行数（デフォルト: 5）
 * @returns ヘッダーとプレビュー行
 */
export const getCSVPreview = (text: string, previewRows = 5): Promise<CSVPreview> => {
	return getDelimitedTextPreview(text, previewRows, { delimiter: ',' });
};

export const getDelimitedTextPreview = (
	text: string,
	previewRows = 5,
	options: DelimitedTextOptions = {}
): Promise<CSVPreview> => {
	const delimiter = options.delimiter ?? ',';
	return new Promise((resolve, reject) => {
		Papa.parse(text, {
			header: true,
			preview: previewRows,
			dynamicTyping: true,
			skipEmptyLines: true,
			delimiter,
			complete: (results: ParseResult<Record<string, string | number>>) => {
				if (
					results.errors.length > 0
					&& (!results.meta.fields || results.meta.fields.length === 0)
				) {
					reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
					return;
				}
				resolve({
					headers: results.meta.fields || [],
					rows: results.data
				});
			},
			error: (error: Error) => {
				reject(new Error(`Failed to read CSV file: ${error.message}`));
			}
		});
	});
};

/**
 * CSVテキスト（UTF-8変換済み）からGeoJSON形式に変換する
 * @param text - UTF-8テキスト
 * @param latColumn - 緯度のカラム名
 * @param lonColumn - 経度のカラム名
 * @returns GeoJSON形式のデータ
 */
export const csvTextToGeojson = (
	text: string,
	latColumn: string,
	lonColumn: string
): Promise<FeatureCollection> => {
	return delimitedTextToGeojson(text, latColumn, lonColumn, { delimiter: ',' });
};

export const delimitedTextToGeojson = (
	text: string,
	latColumn: string,
	lonColumn: string,
	options: DelimitedTextOptions = {}
): Promise<FeatureCollection> => {
	const delimiter = options.delimiter ?? ',';
	const sourceName = options.sourceName ?? 'CSV';
	return new Promise((resolve, reject) => {
		Papa.parse(text, {
			delimiter,
			complete: (results: ParseResult<Record<string, string | number>>) => {
				try {
					resolve(
						tabularRowsToGeojson(
							results.meta.fields || [],
							results.data,
							latColumn,
							lonColumn,
							sourceName
						)
					);
				} catch (error) {
					reject(error);
				}
			},
			header: true,
			dynamicTyping: true,
			skipEmptyLines: true
		});
	});
};

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
): Promise<FeatureCollection> => {
	return new Promise((resolve, reject) => {
		Papa.parse(csv, {
			complete: (results: ParseResult<Record<string, string | number>>) => {
				try {
					resolve(
						tabularRowsToGeojson(
							results.meta.fields || [],
							results.data,
							latColumn,
							lonColumn,
							'CSV'
						)
					);
				} catch (error) {
					reject(error);
				}
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
	geojson: FeatureCollection,
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
				case 'Point': {
					const [lon, lat] = feature.geometry.coordinates as [number, number];
					row[lonColumn] = lon;
					row[latColumn] = lat;
					break;
				}
				case 'LineString':
				case 'MultiPoint': {
					// 最初の座標を使用
					const [firstLon, firstLat] = feature.geometry.coordinates[0] as [
						number,
						number
					];
					row[lonColumn] = firstLon;
					row[latColumn] = firstLat;
					break;
				}
				case 'Polygon':
				case 'MultiLineString': {
					// 最初の座標を使用
					const [polyLon, polyLat] = feature.geometry.coordinates[0][0] as [
						number,
						number
					];
					row[lonColumn] = polyLon;
					row[latColumn] = polyLat;
					break;
				}
				case 'MultiPolygon': {
					// 最初の座標を使用
					const [multiLon, multiLat] = feature.geometry.coordinates[0][0][0] as [
						number,
						number
					];
					row[lonColumn] = multiLon;
					row[latColumn] = multiLat;
					break;
				}
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
	geojson: FeatureCollection,
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
	geojson: FeatureCollection,
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
export const getGeojsonStats = (geojson: FeatureCollection) => {
	if (!geojson.features || geojson.features.length === 0) {
		return { totalFeatures: 0, geometryTypes: {}, properties: {} };
	}

	const stats = {
		totalFeatures: geojson.features.length,
		geometryTypes: {} as Record<string, number>,
		properties: {} as Record<
			string,
			{ count: number; uniqueValues: number; nullCount: number; }
		>
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
