import {
	type SourceSpecification,
	type VectorSourceSpecification,
	type RasterSourceSpecification,
	type GeoJSONSourceSpecification
} from 'maplibre-gl';

import maplibregl from 'maplibre-gl';

import type { GeoDataEntry } from '$map/data/types';

import { layerAttributions } from '$map/store';
import { type AttributionKey } from '$map/data/attribution';

import { GeojsonCache, getGeojson } from '$map/utils/geojson';
import { getFgbToGeojson } from '$map/utils/geojson';

import { fromUrl, Pool } from 'geotiff';
import { encode as fastPngEncode } from 'https://cdn.jsdelivr.net/npm/fast-png@6.1.0/+esm';

// タイルのx/y/z座標をWebメルカトルの境界ボックスに変換する関数を定義
const merc = (x, y, z) => {
	const GEO_R = 6378137;
	const orgX = -1 * ((2 * GEO_R * Math.PI) / 2);
	const orgY = (2 * GEO_R * Math.PI) / 2;
	const unit = (2 * GEO_R * Math.PI) / Math.pow(2, z);
	const minx = orgX + x * unit;
	const maxx = orgX + (x + 1) * unit;
	const miny = orgY - (y + 1) * unit;
	const maxy = orgY - y * unit;
	return [minx, miny, maxx, maxy];
};

// Cloud Optimized GeoTIFF(COG)ソースを生成する非同期関数を定義
const generateCogSource = async (url: string) => {
	// GeoTIFFから指定されたURLの画像を読み込み

	maplibregl.addProtocol('cog', async (params: URL, abortController: AbortController) => {
		const tiff = await fromUrl(url);
		const pool = new Pool();

		console.log(tiff);

		const segments = params.url;

		// タイルインデックスの取得
		const x = parseInt(segments.searchParams.get('x') || '0', 10);
		const y = parseInt(segments.searchParams.get('y') || '0', 10);
		const z = parseInt(segments.searchParams.get('z') || '0', 10);
		// webmercator-bboxを取得
		const bbox = merc(x, y, z);
		// 画像のサイズを指定
		const size = 256;
		// GeoTIFFから特定の境界ボックス(bbox)内のラスターデータを読み込み
		const png = await tiff.readRasters({
			bbox,
			samples: [0], // 4つのバンド（赤、緑、青、アルファ）を取得する
			width: size, // 読み込む画像のサイズを指定
			height: size, // 読み込む画像のサイズを指定
			interleave: true, // バンドを交互に読み込む
			pool // 並列処理のためのワーカープールを指定
		});

		const blob = new Blob([png], { type: 'image/png' });
		const buffer = await blob.arrayBuffer();
		console.log(png);

		return { data: buffer };
	});

	// RasterSourceSpecificationに対応するソースオブジェクトを生成
	const source = {
		type: 'raster',
		tiles: [`cog://{z}/{x}/{y}?x={x}&y={y}&z={z}`],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		attribution:
			'<a href="https://www.geospatial.jp/ckan/dataset/aac-2021710-atami-lp">G空間情報センター 2021年7月10日静岡県熱海市土石流災害航空レーザ計測データ他(CC By 4.0)</a>'
	};

	return { source };
};

export const createSourcesItems = async (
	_dataEntries: GeoDataEntry[]
): Promise<{ [_: string]: SourceSpecification }> => {
	// 各エントリの非同期処理結果を配列に格納
	const sourceItemsArray = await Promise.all(
		_dataEntries.map(async (entry, index) => {
			const items: { [_: string]: SourceSpecification } = {};
			const sourceId = `${entry.id}_source`;
			const { metaData, format, type } = entry;

			switch (type) {
				case 'raster': {
					if (format.type === 'image') {
						items[sourceId] = {
							type: 'raster',
							tiles: [format.url],
							maxzoom: metaData.maxZoom,
							minzoom: metaData.minZoom,
							tileSize: metaData.tileSize,
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						} as RasterSourceSpecification;
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
					} else if (format.type === 'cog') {
						// TODO: cog
						// const { source } = await generateCogSource(format.url);
						// items[sourceId] = {
						// 	...source,
						// 	type: 'raster',
						// 	maxzoom: metaData.maxZoom,
						// 	minzoom: metaData.minZoom,
						// 	attribution: metaData.attribution,
						// 	bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						// } as RasterSourceSpecification;
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
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						} as VectorSourceSpecification;
					} else if (format.type === 'pmtiles') {
						items[sourceId] = {
							type: 'vector',
							url: `pmtiles://${format.url}`,
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
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
