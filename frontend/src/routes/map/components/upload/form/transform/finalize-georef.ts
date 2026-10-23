import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import { createPointCloudEntry } from '$routes/map/data/entries/model';
import { createRasterEntry } from '$routes/map/data/entries/raster';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
import { GeoRefVectorSourceCache } from '$routes/map/utils/cache/georef-vector-source-cache';
import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
import { encodeAllBandsToTerrarium } from '$routes/map/utils/formats/geotiff';
import { createRasterMeshEntryInWorker } from '$routes/map/utils/formats/geotiff/mesh-parallel';
import { NetCDFDataCache } from '$routes/map/utils/formats/netcdf/cache';
import { createPointCloudSurfaceEntry } from '$routes/map/utils/formats/pointcloud/surface';
import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';
import { createVideoEntry } from '$routes/map/utils/formats/video';
import { isBboxValid } from '$routes/map/utils/map/bbox';
import { findCenterTile } from '$routes/map/utils/map/tile';
import {
	warpGeoJSONByCornersParallel,
	warpPointCloudByCornersParallel
} from '$routes/map/utils/transform/georef';
import turfBbox from '@turf/bbox';
import { createVectorEntryGroup } from '../vector-entry-group';
import type {
	GeoRefConfirmPayload,
	GeoRefData,
	GeoRefPointCloudData,
	GeoRefRasterData,
	GeoRefVectorData,
	GeoRefVideoData
} from './georef-types';

/** 生成したレイヤー。disposeはプレビューへ受け渡せなかった場合に呼ぶ。 */
export type GeoRefEntryResult =
	& ({ kind: 'single'; entry: MorivisLayerEntry; } | {
		kind: 'group';
		entries: MorivisLayerEntry[];
	})
	& {
		message: string;
		dispose?: () => void;
	};

const createVectorResult = async (
	data: GeoRefVectorData,
	{ corners }: GeoRefConfirmPayload
): Promise<GeoRefEntryResult> => {
	const sourceFeatureCollection = GeoRefVectorSourceCache.get(data.sourceFeatureCollectionId);
	if (!sourceFeatureCollection) {
		throw new Error('GeoRefベクターの元データが見つかりません');
	}

	const plainCorners = corners.map(([lng, lat]) => [lng, lat]) as typeof corners;
	const warpedGeojson = await warpGeoJSONByCornersParallel(
		sourceFeatureCollection,
		data.sourceCorners,
		plainCorners
	);
	if (data.vectorGroups) {
		const entries = await createVectorEntryGroup(
			warpedGeojson,
			data.vectorGroups
		);
		return { kind: 'group', entries, message: '図形の位置を設定しました' };
	}
	const warpedType = geometryTypeToEntryType(warpedGeojson);
	const warpedBbox = turfBbox(warpedGeojson) as [
		number,
		number,
		number,
		number
	];

	if (!warpedType || !isBboxValid(warpedBbox)) {
		throw new Error('GeoRefベクター変形後のデータが不正です');
	}

	const warpedEntry = await createGeoJsonEntry(
		warpedGeojson,
		warpedType,
		data.entryName,
		warpedBbox,
		data.vectorStyle,
		{ attribution: data.vectorAttribution }
	);

	if (!warpedEntry) {
		throw new Error('GeoRefベクターのエントリ生成に失敗しました');
	}
	// 位置合わせの線は未指定なら1px。入力形式が持つスタイルは優先する。
	const vectorLineWidth = data.vectorLineWidth ?? (data.vectorStyle ? undefined : 1);
	if (vectorLineWidth != null && warpedEntry.style.type === 'line') {
		warpedEntry.style.width = {
			key: '単一',
			expressions: [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: { value: vectorLineWidth }
				}
			]
		};
	}
	return { kind: 'single', entry: warpedEntry, message: 'ベクターの位置を設定しました' };
};

const createPointCloudResult = async (
	data: GeoRefPointCloudData,
	{ bbox, corners }: GeoRefConfirmPayload
): Promise<GeoRefEntryResult> => {
	const sourceBbox = data.pointCloudConfig.sourceBbox;
	const sourceCorners = [
		[sourceBbox[0], sourceBbox[3]],
		[sourceBbox[2], sourceBbox[3]],
		[sourceBbox[2], sourceBbox[1]],
		[sourceBbox[0], sourceBbox[1]]
	] as typeof corners;
	const plainCorners = corners.map(([lng, lat]) => [lng, lat]) as typeof corners;
	const warpedPositions = await warpPointCloudByCornersParallel(
		data.pointCloudConfig.positions,
		sourceCorners,
		plainCorners
	);
	const pointCloudEntry = data.pointCloudConfig.surface
		? (
			await createPointCloudSurfaceEntry(`${data.entryName || '点群データ'}_mesh`, {
				positions: warpedPositions,
				colors: data.pointCloudConfig.colors,
				bounds: bbox,
				...data.pointCloudConfig.surface
			})
		).entry
		: createPointCloudEntry(
			data.entryName || '点群データ',
			{
				positions: warpedPositions,
				colors: data.pointCloudConfig.colors,
				pointCount: data.pointCloudConfig.pointCount
			},
			bbox
		);
	if (data.rasterConfig?.attribution) {
		pointCloudEntry.metaData.attribution = data.rasterConfig.attribution;
	}
	return { kind: 'single', entry: pointCloudEntry, message: '点群の位置を設定しました' };
};

const createVideoResult = async (
	data: GeoRefVideoData,
	{ bbox, corners }: GeoRefConfirmPayload
): Promise<GeoRefEntryResult> => {
	const url = URL.createObjectURL(data.imageFile);
	try {
		const entry = createVideoEntry(
			data.entryName,
			url,
			bbox,
			corners,
			data.previewImageUrl,
			data.rasterConfig?.attribution
		);
		entry.id = data.entryId;
		return {
			kind: 'single',
			entry,
			message: '動画の位置を設定しました',
			dispose: () => URL.revokeObjectURL(url)
		};
	} catch (cause) {
		URL.revokeObjectURL(url);
		throw cause;
	}
};

const createRasterResult = async (
	data: GeoRefRasterData,
	{ bbox, corners }: GeoRefConfirmPayload
): Promise<GeoRefEntryResult> => {
	if (data.rasterImage) {
		const entry = createRasterEntry(data.entryName, data.rasterImage.url, { bounds: bbox });
		entry.id = data.entryId;
		entry.metaData.imageCorners = corners.map(([lng, lat]) => [lng, lat]) as typeof corners;
		entry.metaData.attribution = data.rasterImage.attribution;
		entry.metaData.mapImage = data.previewImageUrl ?? data.rasterImage.url;
		return { kind: 'single', entry, message: '画像の位置を設定しました' };
	}

	GeoTiffCache.setBbox(data.entryId, bbox);
	GeoTiffCache.setSize(data.entryId, data.imageWidth, data.imageHeight);
	GeoTiffCache.setNumBands(data.entryId, data.numBands);

	const mapImage = generateThumbnail({
		bands: data.parsedBands,
		width: data.imageWidth,
		height: data.imageHeight
	});

	if (data.registrationMode === 'mesh' && data.numBands === 1) {
		const entry = await createRasterMeshEntryInWorker({
			id: data.entryId,
			name: data.entryName || 'GeoTIFF 3Dメッシュ',
			band: data.parsedBands[0],
			width: data.imageWidth,
			height: data.imageHeight,
			nodata: data.parsedNodata,
			bounds: bbox,
			corners,
			mapImage,
			baseValue: data.meshConfig?.baseValue,
			heightScale: data.meshConfig?.heightScale,
			autoHeightScale: data.meshConfig?.autoHeightScale
		});

		if (data.meshConfig?.attribution) {
			entry.metaData.attribution = data.meshConfig.attribution;
		}
		if (data.meshConfig?.opacity != null) {
			entry.style.opacity = data.meshConfig.opacity;
		}
		if (entry.style.shading && data.meshConfig?.shadingEnabled != null) {
			entry.style.shading = {
				...entry.style.shading,
				enabled: data.meshConfig.shadingEnabled
			};
		}
		if (entry.style.heightColorRamp && data.meshConfig?.heightColorRampEnabled != null) {
			entry.style.heightColorRamp = {
				...entry.style.heightColorRamp,
				enabled: data.meshConfig.heightColorRampEnabled
			};
		}
		if (data.meshConfig?.temporalDimension) {
			entry.state = {
				...entry.state,
				dimension: {
					currentIndex: data.meshConfig.initialDimensionIndex ?? 0
				}
			};
			entry.properties = {
				...entry.properties,
				temporal: {
					dimension: data.meshConfig.temporalDimension
				}
			};

			const cachedEntry = NetCDFDataCache.get(data.entryId);
			if (cachedEntry && data.meshConfig.heightScale != null) {
				cachedEntry.meshConfig = {
					baseValue: data.meshConfig.baseValue ?? 0,
					heightScale: data.meshConfig.heightScale,
					maxGridSize: 192
				};
			}
		}
		return { kind: 'single', entry, message: '3Dメッシュを生成しました' };
	}

	await encodeAllBandsToTerrarium(
		data.entryId,
		data.parsedBands,
		data.imageWidth,
		data.imageHeight,
		data.parsedNodata,
		data.dataRanges
	);

	const isSingleBand = data.numBands === 1;
	const entry: RasterImageEntry<RasterTiffStyle> = {
		id: data.entryId,
		type: 'raster',
		format: {
			type: 'image',
			url: ''
		},
		metaData: {
			...DEFAULT_CUSTOM_META_DATA,
			attribution: data.rasterConfig?.attribution ?? 'GeoTIFF',
			name: data.entryName || '画像データ',
			tileSize: 256,
			bounds: bbox,
			imageCorners: corners,
			xyzImageTile: findCenterTile(bbox),
			mapImage
		},
		properties: {
			bands: {
				numBands: data.numBands
			}
		},
		interaction: {
			...DEFAULT_RASTER_BASEMAP_INTERACTION
		},
		style: {
			type: 'tiff',
			opacity: 1,
			visible: true,
			visualization: {
				mode: isSingleBand ? 'single' : 'multi',
				uniformsData: {
					single: {
						index: 0,
						min: data.bandMinMax.min,
						max: data.bandMinMax.max,
						colorMap: data.rasterConfig?.singleColorMap ?? 'jet'
					},
					multi: {
						r: {
							index: 0,
							min: data.multiBandMinMax.r.min,
							max: data.multiBandMinMax.r.max
						},
						g: {
							index: data.numBands >= 2 ? 1 : 0,
							min: data.multiBandMinMax.g.min,
							max: data.multiBandMinMax.g.max
						},
						b: {
							index: data.numBands >= 3 ? 2 : 0,
							min: data.multiBandMinMax.b.min,
							max: data.multiBandMinMax.b.max
						}
					}
				}
			}
		}
	};
	return { kind: 'single', entry, message: '画像の位置を設定しました' };
};

/** 座標変換とレイヤー生成を行う。UIの登録・通知・キャッシュの破棄は呼び出し元が扱う。 */
export const createGeoRefEntries = (
	data: GeoRefData,
	payload: GeoRefConfirmPayload
): Promise<GeoRefEntryResult> => {
	switch (data.sourceType) {
		case 'vector':
			return createVectorResult(data, payload);
		case 'pointcloud':
			return createPointCloudResult(data, payload);
		case 'video':
			return createVideoResult(data, payload);
		case 'raster':
			return createRasterResult(data, payload);
	}
};
