import type { BaseMetaData, GeoDataEntry } from '$routes/map/data/types';
import type { SimpleFeatureCollection } from '$routes/map/types/geojson';
import type {
	VectorEntry,
	GeoJsonMetaData,
	VectorEntryGeometryType,
	TileMetaData
} from '$routes/map/data/types/vector';

import { getUniquePropertyKeys } from '$routes/map/utils/properties';
import { GeojsonCache } from '$routes/map/utils/file/geojson';
import {
	DEFAULT_RASTER_BASEMAP_STYLE,
	DEFAULT_RASTER_BASEMAP_INTERACTION
} from '$routes/map/data/style';

import {
	DEFAULT_VECTOR_POINT_STYLE,
	DEFAULT_VECTOR_LINE_STYLE,
	DEFAULT_VECTOR_POLYGON_STYLE
} from '$routes/map/data/style';

import { getRandomColor } from '$routes/map/utils/color/color-brewer';
import { createLabelsExpressions } from '$routes/map/data/style';

import type { RasterEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_WORLD_BBOX } from './location_bbox';

import type { LayerType } from '$routes/map/utils/entries';
import { getLayerType } from '$routes/map/utils/entries';
import Fuse from 'fuse.js';
import { encode } from '$routes/map/utils/normalized';

// 共通の初期化処理
// visible を true にする
const initData = (data: GeoDataEntry[]) => {
	try {
		data.forEach((value) => {
			value.style.visible = true;
		});
	} catch (e) {
		console.error(e);
		console.warn('初期化処理に失敗しました。');
	}

	return data;
};

const entryModules: Record<string, { default: GeoDataEntry }> = import.meta.glob(
	'$routes/map/data/entries/**/[!_]*.ts',
	{
		eager: true
	}
);

export const entries: GeoDataEntry[] = Object.values(entryModules)
	.map((mod) => mod.default)
	.sort((a, b) => a.metaData.name.localeCompare(b.metaData.name, 'ja'));

export const geoDataEntries = (() => {
	// 全てのIDを取得
	const allIds = entries.map((entry) => entry.id);

	// 重複するIDを検出
	const duplicateKeys = allIds.filter((id, index, self) => self.indexOf(id) !== index);

	// 警告を出力
	if (duplicateKeys.length > 0) {
		console.warn('idが重複してます。:', duplicateKeys);
	}

	// オブジェクトを結合
	return initData(entries);
})();

export const layerDataFuse = new Fuse(geoDataEntries, {
	keys: ['metaData.name', 'metaData.tags', 'metaData.location', 'metaData.attribution'],
	threshold: 0.3,
	getFn: (obj: GeoDataEntry, path: string | string[]) => {
		const values = [];
		if (obj.metaData.name) values.push(encode(obj.metaData.name));
		if (obj.metaData.location) values.push(encode(obj.metaData.location));
		if (obj.metaData.attribution) values.push(encode(obj.metaData.attribution));
		if (obj.metaData.tags && Array.isArray(obj.metaData.tags)) {
			obj.metaData.tags.forEach((tag) => {
				values.push(encode(tag));
			});
		}
		return values;
	}
});

// TODO カスタムデータの削除処理
export class EntryIdToTypeMap {
	private static map: Map<string, LayerType> = new Map(
		entries.map((geoDataEntries) => [geoDataEntries.id, getLayerType(geoDataEntries) ?? 'raster'])
	);

	static get(id: string): LayerType | undefined {
		return this.map.get(id);
	}

	static has(id: string): boolean {
		return this.map.has(id);
	}

	static add(id: string, type: LayerType): void {
		if (!this.map.has(id)) {
			this.map.set(id, type);
		}
	}

	static keys(): string[] {
		return Array.from(this.map.keys());
	}
}

/** geojsonのジオメトリ対応からEntryTypeを取得 */
export const geometryTypeToEntryType = (
	geojson: SimpleFeatureCollection
): VectorEntryGeometryType | undefined => {
	const geometryTypes = new Set<string>();
	geojson.features.forEach((feature) => {
		if (feature.geometry && feature.geometry.type) {
			geometryTypes.add(feature.geometry.type);
		}
	});

	if (geometryTypes.has('Point')) {
		return 'Point';
	} else if (geometryTypes.has('LineString')) {
		return 'LineString';
	} else if (geometryTypes.has('Polygon')) {
		return 'Polygon';
	} else if (geometryTypes.has('MultiPoint')) {
		return 'Point';
	} else if (geometryTypes.has('MultiLineString')) {
		return 'LineString';
	} else if (geometryTypes.has('MultiPolygon')) {
		return 'Polygon';
	}
};

const defaultCustomMetaData: BaseMetaData = {
	name: 'カスタムデータ',
	description: 'ユーザーがアップロードしたデータ',
	attribution: 'カスタムデータ',
	location: '不明',
	maxZoom: 24,
	minZoom: 0,
	tags: [],
	bounds: WEB_MERCATOR_WORLD_BBOX,
	xyzImageTile: { x: 0, y: 0, z: 0 }
};

export const createGeoJsonEntry = (
	data: SimpleFeatureCollection,
	entryGeometryType: VectorEntryGeometryType,
	name: string,
	bbox: [number, number, number, number],
	color: string = getRandomColor()
): VectorEntry<GeoJsonMetaData> | undefined => {
	const metaData: GeoJsonMetaData = {
		...defaultCustomMetaData,
		name,
		bounds: bbox
	};

	let style;

	if (entryGeometryType === 'Point') {
		style = DEFAULT_VECTOR_POINT_STYLE;
	} else if (entryGeometryType === 'LineString') {
		style = DEFAULT_VECTOR_LINE_STYLE;
	} else if (entryGeometryType === 'Polygon') {
		style = DEFAULT_VECTOR_POLYGON_STYLE;
	} else if (entryGeometryType === 'Label') {
		// TODO : Labelのスタイルを作成する
		style = DEFAULT_VECTOR_POINT_STYLE;

		return undefined;
	} else {
		console.error('不明なジオメトリタイプです。');
		return undefined;
	}

	if (!style) {
		console.error('スタイルが見つかりませんでした。');
		return undefined;
	}

	style.colors = {
		key: '単色',
		show: true,
		expressions: [
			{
				type: 'single',
				key: '単色',
				name: '単色',
				mapping: {
					value: color
				}
			}
		]
	};

	const propKes = getUniquePropertyKeys(data);

	style.labels = createLabelsExpressions(propKes);

	const id = 'geojson_' + crypto.randomUUID();
	GeojsonCache.set(id, data);

	const entry: VectorEntry<GeoJsonMetaData> = {
		id,
		type: 'vector',
		format: {
			type: 'geojson',
			geometryType: entryGeometryType,
			url: ''
		},
		metaData,
		interaction: {
			clickable: true
		},
		properties: {
			keys: propKes,
			titles: [
				{
					conditions: [],
					template: name
				}
			]
		},
		style
	};
	return entry;
};

export const createVectorTileEntry = (
	name: string,
	url: string,
	sourceLayer: string,
	entryGeometryType: VectorEntryGeometryType,
	color: string = getRandomColor()
): VectorEntry<TileMetaData> | undefined => {
	const metaData: TileMetaData = {
		...defaultCustomMetaData,
		name,
		sourceLayer
	};

	let style;

	if (entryGeometryType === 'Point') {
		style = DEFAULT_VECTOR_POINT_STYLE;
	} else if (entryGeometryType === 'LineString') {
		style = DEFAULT_VECTOR_LINE_STYLE;
	} else if (entryGeometryType === 'Polygon') {
		style = DEFAULT_VECTOR_POLYGON_STYLE;
	} else if (entryGeometryType === 'Label') {
		// TODO : Labelのスタイルを作成する
		style = DEFAULT_VECTOR_POINT_STYLE;

		return undefined;
	} else {
		console.error('不明なジオメトリタイプです。');
		return undefined;
	}

	if (!style) {
		console.error('スタイルが見つかりませんでした。');
		return undefined;
	}

	style.colors = {
		key: '単色',
		show: true,
		expressions: [
			{
				type: 'single',
				key: '単色',
				name: '単色',
				mapping: {
					value: color
				}
			}
		]
	};

	const id = 'vectorTile_' + crypto.randomUUID();

	const entry: VectorEntry<TileMetaData> = {
		id,
		type: 'vector',
		format: {
			type: 'mvt',
			geometryType: entryGeometryType,
			url
		},
		metaData,
		interaction: {
			clickable: true
		},
		properties: {
			keys: [],
			titles: [
				{
					conditions: [],
					template: name
				}
			]
		},
		style
	};

	return entry;
};

// TODO: タイルサイズ指定
export const createRasterEntry = (name: string, url: string): RasterEntry<RasterBaseMapStyle> => {
	const entry: RasterEntry<RasterBaseMapStyle> = {
		id: 'raster_' + crypto.randomUUID(),
		type: 'raster',
		format: {
			type: 'image',
			url
		},
		metaData: {
			...defaultCustomMetaData,
			name,
			tileSize: 256,
			bounds: WEB_MERCATOR_WORLD_BBOX
		},
		interaction: {
			...DEFAULT_RASTER_BASEMAP_INTERACTION
		},
		style: {
			...DEFAULT_RASTER_BASEMAP_STYLE
		}
	};

	return entry;
};
