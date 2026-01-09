import { GeoPackageAPI, GeoPackage } from '@ngageoint/geopackage';

/**
 * GPKGファイルから読み込んだGeoJSONフィーチャーの型定義
 */
export interface GeoJSONFeature {
	type: 'Feature';
	geometry: any;
	properties: { [key: string]: any };
	id?: string | number;
}

/**
 * GeoJSONフィーチャーコレクションの型定義
 */
export interface GeoJSONFeatureCollection {
	type: 'FeatureCollection';
	features: GeoJSONFeature[];
}

/**
 * GPKGファイルの読み込みオプション
 */
export interface GpkgReadOptions {
	/** 読み込む特定のテーブル名（未指定の場合は全てのフィーチャーテーブル） */
	tableName?: string;
	/** プロパティに含める列名のリスト（未指定の場合は全ての列） */
	includeColumns?: string[];
	/** プロパティから除外する列名のリスト */
	excludeColumns?: string[];
	/** 最大フィーチャー数の制限 */
	maxFeatures?: number;
	/** 空間フィルタリング用のバウンディングボックス [minX, minY, maxX, maxY] */
	boundingBox?: [number, number, number, number];
}

/**
 * GPKGファイルの情報
 */
export interface GpkgInfo {
	/** フィーチャーテーブルのリスト */
	featureTables: string[];
	/** タイルテーブルのリスト */
	tileTables: string[];
	/** 各テーブルの詳細情報 */
	tableInfo: { [tableName: string]: any };
}

/**
 * GPKGファイルからGeoJSONを読み込むヘルパークラス
 */
export class GpkgToGeoJsonConverter {
	private geoPackage: GeoPackage | null = null;

	/**
	 * GPKGファイルを開く
	 * @param filePath ファイルパス（Node.js）またはUint8Array（ブラウザ）
	 */
	async open(filePath: string | Uint8Array): Promise<void> {
		try {
			this.geoPackage = await GeoPackageAPI.open(filePath);
		} catch (error) {
			throw new Error(`GPKGファイルの読み込みに失敗しました: ${error}`);
		}
	}

	/**
	 * GPKGファイルを閉じる
	 */
	close(): void {
		if (this.geoPackage) {
			this.geoPackage.close();
			this.geoPackage = null;
		}
	}

	/**
	 * GPKGファイルの基本情報を取得
	 */
	getInfo(): GpkgInfo {
		if (!this.geoPackage) {
			throw new Error('GPKGファイルが開かれていません');
		}

		const featureTables = this.geoPackage.getFeatureTables();
		const tileTables = this.geoPackage.getTileTables();
		const tableInfo: { [tableName: string]: any } = {};

		// フィーチャーテーブルの情報を取得
		featureTables.forEach((tableName) => {
			const featureDao = this.geoPackage!.getFeatureDao(tableName);
			tableInfo[tableName] = {
				type: 'feature',
				count: featureDao.count(),
				columns: featureDao.table.columns.getColumnNames(),
				geometryType: featureDao.geometryType,
				srs: featureDao.srs
			};
		});

		// タイルテーブルの情報を取得
		tileTables.forEach((tableName) => {
			const tileDao = this.geoPackage!.getTileDao(tableName);
			tableInfo[tableName] = {
				type: 'tile',
				count: tileDao.count(),
				minZoom: tileDao.minZoom,
				maxZoom: tileDao.maxZoom,
				srs: tileDao.srs
			};
		});

		return {
			featureTables,
			tileTables,
			tableInfo
		};
	}

	/**
	 * 指定されたテーブルまたは全てのフィーチャーテーブルからGeoJSONを読み込む
	 * @param options 読み込みオプション
	 */
	async readGeoJson(options: GpkgReadOptions = {}): Promise<GeoJSONFeatureCollection> {
		if (!this.geoPackage) {
			throw new Error('GPKGファイルが開かれていません');
		}

		const allFeatures: GeoJSONFeature[] = [];
		const featureTables = options.tableName
			? [options.tableName]
			: this.geoPackage.getFeatureTables();

		for (const tableName of featureTables) {
			try {
				const tableFeatures = await this.readTableGeoJson(tableName, options);
				allFeatures.push(...tableFeatures);

				// 最大フィーチャー数の制限チェック
				if (options.maxFeatures && allFeatures.length >= options.maxFeatures) {
					break;
				}
			} catch (error) {
				console.warn(`テーブル ${tableName} の読み込みに失敗しました:`, error);
			}
		}

		// 最大フィーチャー数でトリミング
		const features = options.maxFeatures ? allFeatures.slice(0, options.maxFeatures) : allFeatures;

		return {
			type: 'FeatureCollection',
			features
		};
	}

	/**
	 * 指定されたテーブルからGeoJSONフィーチャーを読み込む
	 * @param tableName テーブル名
	 * @param options 読み込みオプション
	 */
	private async readTableGeoJson(
		tableName: string,
		options: GpkgReadOptions
	): Promise<GeoJSONFeature[]> {
		if (!this.geoPackage) {
			throw new Error('GPKGファイルが開かれていません');
		}

		const features: GeoJSONFeature[] = [];
		const featureDao = this.geoPackage.getFeatureDao(tableName);

		// GeoJSONフィーチャーの直接取得を試行
		try {
			const geoJSONIterator = this.geoPackage.iterateGeoJSONFeatures(tableName);

			for (const feature of geoJSONIterator) {
				// プロパティのフィルタリング
				const filteredProperties = this.filterProperties(
					feature.properties as { [key: string]: any },
					options
				);

				const processedFeature: GeoJSONFeature = {
					type: 'Feature',
					geometry: feature.geometry,
					properties: filteredProperties,
					id: feature.id
				};

				features.push(processedFeature);

				// 最大フィーチャー数の制限チェック
				if (options.maxFeatures && features.length >= options.maxFeatures) {
					break;
				}
			}
		} catch (error) {
			console.warn(`テーブル ${tableName} のGeoJSON直接取得に失敗、手動変換を試行:`, error);

			// 手動でフィーチャーをGeoJSONに変換
			const featureResultSet = featureDao.queryForAll();

			for (const featureRow of featureResultSet) {
				try {
					const feature = this.convertFeatureRowToGeoJSON(featureRow as any, featureDao, options);
					if (feature) {
						features.push(feature);
					}

					// 最大フィーチャー数の制限チェック
					if (options.maxFeatures && features.length >= options.maxFeatures) {
						break;
					}
				} catch (conversionError) {
					console.warn(`フィーチャー変換エラー:`, conversionError);
				}
			}
		}

		return features;
	}

	/**
	 * FeatureRowをGeoJSONフィーチャーに変換
	 * @param featureRow フィーチャー行
	 * @param featureDao フィーチャーDAO
	 * @param options 読み込みオプション
	 */
	private convertFeatureRowToGeoJSON(
		featureRow: { geometry: any; id: number; getValueWithColumnName: (name: string) => any },
		featureDao: {
			table: { columns: { getColumnNames: () => string[] } };
			getGeometryColumnName: () => string;
		},
		options: GpkgReadOptions
	): GeoJSONFeature | null {
		try {
			const geometry = featureRow.geometry;
			if (!geometry) {
				return null;
			}

			// ジオメトリをGeoJSON形式に変換
			const geoJsonGeometry = geometry.toGeoJSON();

			// プロパティを取得
			const properties: { [key: string]: any } = {};
			const columnNames = featureDao.table.columns.getColumnNames();
			const geometryColumnName = featureDao.getGeometryColumnName();

			for (const columnName of columnNames) {
				if (columnName !== geometryColumnName) {
					const value = featureRow.getValueWithColumnName(columnName);
					properties[columnName] = value;
				}
			}

			// プロパティのフィルタリング
			const filteredProperties = this.filterProperties(properties, options);

			return {
				type: 'Feature',
				geometry: geoJsonGeometry,
				properties: filteredProperties,
				id: featureRow.id
			};
		} catch (error) {
			console.warn('フィーチャー変換エラー:', error);
			return null;
		}
	}

	/**
	 * プロパティをフィルタリング
	 * @param properties 元のプロパティ
	 * @param options フィルタリングオプション
	 */
	private filterProperties(
		properties: { [key: string]: any },
		options: GpkgReadOptions
	): { [key: string]: any } {
		if (!properties) return {};

		let filteredProperties = { ...properties };

		// 包含列の指定がある場合
		if (options.includeColumns && options.includeColumns.length > 0) {
			const includedProperties: { [key: string]: any } = {};
			for (const columnName of options.includeColumns) {
				if (columnName in filteredProperties) {
					includedProperties[columnName] = filteredProperties[columnName];
				}
			}
			filteredProperties = includedProperties;
		}

		// 除外列の指定がある場合
		if (options.excludeColumns && options.excludeColumns.length > 0) {
			for (const columnName of options.excludeColumns) {
				delete filteredProperties[columnName];
			}
		}

		return filteredProperties;
	}
}

/**
 * GPKGファイルをGeoJSONに変換するユーティリティ関数
 * @param filePath ファイルパス（Node.js）またはUint8Array（ブラウザ）
 * @param options 読み込みオプション
 */
export async function gpkgToGeoJson(
	filePath: string | Uint8Array,
	options: GpkgReadOptions = {}
): Promise<GeoJSONFeatureCollection> {
	const converter = new GpkgToGeoJsonConverter();

	try {
		await converter.open(filePath);
		const geoJson = await converter.readGeoJson(options);
		return geoJson;
	} finally {
		converter.close();
	}
}

/**
 * GPKGファイルの情報を取得するユーティリティ関数
 * @param filePath ファイルパス（Node.js）またはUint8Array（ブラウザ）
 */
export async function getGpkgInfo(filePath: string | Uint8Array): Promise<GpkgInfo> {
	const converter = new GpkgToGeoJsonConverter();

	try {
		await converter.open(filePath);
		return converter.getInfo();
	} finally {
		converter.close();
	}
}

/**
 * 使用例:
 *
 * // ブラウザ（File APIと組み合わせ）
 * const fileInput = document.getElementById('fileInput') as HTMLInputElement;
 * const file = fileInput.files[0];
 * const arrayBuffer = await file.arrayBuffer();
 * const geoJson = await gpkgToGeoJson(new Uint8Array(arrayBuffer));
 *
 * // オプションを指定
 * const geoJson = await gpkgToGeoJson('/path/to/file.gpkg', {
 *   tableName: 'specific_table',
 *   maxFeatures: 1000,
 *   includeColumns: ['name', 'type'],
 *   excludeColumns: ['internal_id']
 * });
 *
 * // ファイル情報を取得
 * const info = await getGpkgInfo('/path/to/file.gpkg');
 * console.log('フィーチャーテーブル:', info.featureTables);
 * console.log('タイルテーブル:', info.tileTables);
 */
