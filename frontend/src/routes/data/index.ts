import type { GeoDataEntry } from '$routes/data/types';
import type { GeoJSONGeometryType } from '$routes/utils/geojson';
import type { MapGeoJSONFeature, SourceSpecification, LayerSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import type { VectorEntry, GeoJsonMetaData, GeometryType } from '$routes/data/types/vector';
import turfBbox from '@turf/bbox';
import { getUniquePropertyKeys } from '$routes/utils/properties';
import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle,
	LabelStyle
} from '$routes/data/types/vector/style';
import { DEFAULT_VECTOR_POINT_STYLE } from '$routes/data/style';

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
	type: GeometryType,
	name: string
): VectorEntry<GeoJsonMetaData> | undefined => {
	let style;
	const bbox = turfBbox(data);

	if (type === 'Point') {
		style = DEFAULT_VECTOR_POINT_STYLE;
		const entry: VectorEntry<GeoJsonMetaData> = {
			id: 'geojson_' + crypto.randomUUID(),
			type: 'vector',
			format: {
				type: 'geojson',
				geometryType: 'Point',
				url: '',
				data: data
			},
			metaData: {
				name,
				description: 'ユーザーがアップロードしたカスタムデータ',
				attribution: 'カスタムデータ',
				location: '不明',
				maxZoom: 22,
				bounds: bbox ? (bbox as [number, number, number, number]) : undefined
			},
			interaction: {
				clickable: true
			},
			properties: {
				keys: getUniquePropertyKeys(data),
				titles: []
			},
			style
		};
		return entry;
	}
};
