import type { GeoDataEntry } from '$routes/data/types';
import type { GeoJSONGeometryType } from '$routes/utils/geojson';
import type { MapGeoJSONFeature, SourceSpecification, LayerSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import type {
	VectorEntry,
	GeoJsonMetaData,
	VectorEntryGeometryType
} from '$routes/data/types/vector';
import turfBbox from '@turf/bbox';
import { getUniquePropertyKeys } from '$routes/utils/properties';
import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle,
	LabelStyle
} from '$routes/data/types/vector/style';
import {
	DEFAULT_VECTOR_POINT_STYLE,
	DEFAULT_VECTOR_LINE_STYLE,
	DEFAULT_VECTOR_POLYGON_STYLE
} from '$routes/data/style';

import { getRandomCommonColor } from '$routes/utils/colorMapping';
import { createLabelsExpressions } from '$routes/data/style';

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
	'$routes/data/entries/**/[!_]*.ts',
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

export const createGeoJsonEntry = (
	data: FeatureCollection,
	entryGeometryType: VectorEntryGeometryType,
	name: string,
	color: string = getRandomCommonColor()
): VectorEntry<GeoJsonMetaData> | undefined => {
	const bbox = turfBbox(data);
	const metaData: GeoJsonMetaData = {
		name,
		description: 'ユーザーがアップロードしたカスタムデータ',
		attribution: 'カスタムデータ',
		location: '不明',
		maxZoom: 22,
		bounds: bbox ? (bbox as [number, number, number, number]) : undefined
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

	const entry: VectorEntry<GeoJsonMetaData> = {
		id: 'geojson_' + crypto.randomUUID(),
		type: 'vector',
		format: {
			type: 'geojson',
			geometryType: entryGeometryType,
			url: '',
			data: data
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
					template: 'カスタムデータ'
				}
			]
		},
		style
	};
	return entry;
};
