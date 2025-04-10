import {
	type SourceSpecification,
	type VectorSourceSpecification,
	type RasterSourceSpecification,
	type GeoJSONSourceSpecification
} from 'maplibre-gl';

import type { GeoDataEntry } from '$routes/data/types';

import { layerAttributions } from '$routes/store';
import { type AttributionKey } from '$routes/data/attribution';

import { GeojsonCache, getGeojson } from '$routes/utils/geojson';
import { getFgbToGeojson } from '$routes/utils/geojson';

// TODO: Geotiff
// import { fromUrl, Pool } from 'geotiff';

const detectTileScheme = (url: string): 'tms' | 'xyz' => {
	return url.includes('{-y}') ? 'tms' : 'xyz';
};

export const createSourcesItems = async (
	_dataEntries: GeoDataEntry[]
): Promise<{ [_: string]: SourceSpecification }> => {
	// 各エントリの非同期処理結果を配列に格納
	const sourceItemsArray = await Promise.all(
		_dataEntries.map(async (entry, index) => {
			const items: { [_: string]: SourceSpecification } = {};
			const sourceId = `${entry.id}_source`;
			const { metaData, format, type, style } = entry;

			switch (type) {
				case 'raster': {
					if (format.type === 'image') {
						if (style.type === 'dem') {
							items[sourceId] = {
								type: 'raster',
								tiles: [`webgl://${format.url}?x={x}&y={y}&z={z}`],
								maxzoom: metaData.maxZoom,
								minzoom: metaData.minZoom,
								tileSize: metaData.tileSize,
								attribution: metaData.attribution,
								bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
							} as RasterSourceSpecification;
						} else {
							items[sourceId] = {
								type: 'raster',
								tiles: [format.url],
								maxzoom: metaData.maxZoom,
								minzoom: metaData.minZoom,
								scheme: detectTileScheme(format.url),
								tileSize: metaData.tileSize,
								attribution: metaData.attribution,
								bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
							} as RasterSourceSpecification;
						}
					} else if (format.type === 'pmtiles') {
						items[sourceId] = {
							type: 'raster',
							url: `pmtiles://${format.url}`,
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							tileSize: metaData.tileSize,
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						} as RasterSourceSpecification;
					}
					break;
				}
				case 'vector': {
					if (format.type === 'geojson' || format.type === 'fgb') {
						let geojson: GeoJSON.GeoJSON | string = '';
						if (GeojsonCache.has(entry.id)) {
							geojson = GeojsonCache.get(entry.id);
						} else if (format.type === 'fgb') {
							geojson = await getFgbToGeojson(format.url);
							GeojsonCache.set(entry.id, geojson);
						} else if (format.type === 'geojson') {
							geojson = await getGeojson(format.url);
							GeojsonCache.set(entry.id, geojson);
						}

						items[sourceId] = {
							type: 'geojson',
							data: geojson,
							generateId: true,
							maxzoom: metaData.maxZoom,
							attribution: metaData.attribution

							// lineMetrics: true // ラインの長さをメートルで取得 重たい場合は削除
							// tolerance: 1.5 // ピクセル単位で許容誤差を増加
							// TODO: 線のグラセーシュンをする場合は以下を追加
						} as GeoJSONSourceSpecification;
					} else if (format.type === 'mvt') {
						items[sourceId] = {
							type: 'vector',
							tiles: [format.url],
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						} as VectorSourceSpecification;
					} else if (format.type === 'pmtiles') {
						items[sourceId] = {
							type: 'vector',
							url: `pmtiles://${format.url}`,
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						} as VectorSourceSpecification;
					}
					break;
				}
				default:
					console.warn(`Unknown layer: ${sourceId}`);
					break;
			}

			return { index, items }; // インデックスを含めて返す
		})
	);

	// 出典表示のための Set
	const attributions: Set<AttributionKey> = new Set();

	// インデックス順に並び替え
	const sortedItems = sourceItemsArray
		.sort((a, b) => a.index - b.index) // インデックス順にソート
		.map((item) => {
			const sourceId = Object.keys(item.items)[0];
			// NOTE: attributionは必須なので存在することを前提とする
			const source = item.items[sourceId] as RasterSourceSpecification;
			const attributionKey = source.attribution as AttributionKey;

			attributions.add(attributionKey);

			return item.items;
		}); // items だけを抽出

	// 配列をオブジェクトに統合
	const sourceItems = Object.assign({}, ...sortedItems);

	// 出典表示を store に保存
	if (attributions.size > 0) layerAttributions.set(Array.from(attributions));

	return sourceItems;
};
