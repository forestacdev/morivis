import { FORMAT_RESOURCE_LIMITS } from '../resource-limits';
/**
 * Format spec:
 * - https://github.com/openstreetmap/OSM-binary/tree/master/osmpbf
 * References:
 * - https://gdal.org/en/stable/drivers/vector/osm.html
 */
import type { FeatureCollection } from '$routes/map/types/geojson';
import { normalizeGeoJsonGeometryCollections } from '$routes/map/utils/formats/geojson/normalize';
import type initGdalJs from 'gdal3.js';

export type OsmPbfGdal = Awaited<ReturnType<typeof initGdalJs>>;
const LAYERS = ['points', 'lines', 'multilinestrings', 'multipolygons', 'other_relations'];
const MAX_FEATURES = FORMAT_RESOURCE_LIMITS['osm-pbf'].maxFeatures;
const MAX_OUTPUT_BYTES = FORMAT_RESOURCE_LIMITS['osm-pbf'].maxOutputBytes;

/** GDALの5レイヤーを共通のWGS84ベクターへ結合する。 */
export const convertOsmPbf = async (
	gdal: OsmPbfGdal,
	file: File | string,
	assertNoErrors: () => void = () => {}
): Promise<FeatureCollection> => {
	const features: FeatureCollection['features'] = [];
	let outputBytes = 0;
	for (const layer of LAYERS) {
		// OSMは前向き読み取り。レイヤーごとに開き直してノード参照を再構築する。
		const opened = await gdal.open(file, ['TAGS_FORMAT=JSON']);
		try {
			assertNoErrors();
			const dataset = opened.datasets[0];
			if (
				!dataset
				|| (dataset.info as { driverShortName?: string; }).driverShortName !== 'OSM'
			) {
				throw new Error('OSM PBFとして読み込めませんでした');
			}
			const output = await gdal.ogr2ogr(dataset, ['-f', 'GeoJSON', layer], `osm_${layer}`);
			assertNoErrors();
			const bytes = await gdal.getFileBytes(output);
			outputBytes += bytes.byteLength;
			if (outputBytes > MAX_OUTPUT_BYTES) {
				throw new Error('OSMの展開結果が大きすぎます。範囲を分割してください');
			}
			const json = JSON.parse(new TextDecoder().decode(bytes));
			if (json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
				throw new Error('OSM PBFの変換結果が不正です');
			}
			// 同じ数値IDでもnode・way・relationは別地物。元IDを文字列として保持する。
			for (const feature of json.features) {
				if (!feature.geometry) continue;
				const properties = feature.properties ?? {};
				const osmType = layer === 'points'
					? 'node'
					: layer === 'lines' || properties.osm_way_id != null
					? 'way'
					: 'relation';
				const osmId = properties.osm_way_id ?? properties.osm_id;
				feature.id = `${osmType}/${osmId}`;
				const extra = typeof properties.other_tags === 'string'
					? JSON.parse(properties.other_tags)
					: properties.other_tags;
				feature.properties = {
					...extra,
					...properties,
					'osm:type': osmType,
					'osm:id': String(osmId)
				};
				delete feature.properties.other_tags;
				const normalized = normalizeGeoJsonGeometryCollections(feature);
				for (const item of normalized.features) features.push(item);
				if (features.length > MAX_FEATURES) {
					throw new Error('OSMは50万地物以下に分割してください');
				}
			}
		} finally {
			for (const dataset of opened.datasets) await gdal.close(dataset);
		}
	}
	if (!features.length) throw new Error('OSMファイルに描画可能な地物がありません');
	return { type: 'FeatureCollection', features };
};
