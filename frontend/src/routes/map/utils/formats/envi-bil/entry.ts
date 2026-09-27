import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
import { encodeAllBandsToTerrarium } from '$routes/map/utils/formats/geotiff';
import { createRasterMeshEntryInWorker } from '$routes/map/utils/formats/geotiff/mesh-parallel';
import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';
import { findCenterTile } from '$routes/map/utils/map/tile';
import type { RawRaster } from '.';

/** WGS84の等間隔格子を既存の多バンドラスター／メッシュentryへ渡す。 */
export const createRawRasterEntry = async (
	grid: RawRaster,
	name: string,
	mode: 'raster' | 'mesh',
	signal: AbortSignal
) => {
	if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
	const id = `raw_raster_${crypto.randomUUID()}`;
	const { bands, width, height, bbox: bounds, ranges } = grid;
	const band = bands[0];
	const singleIndex = grid.defaultBands[0] ?? 0;
	const rgb = [0, 1, 2].map(index =>
		grid.defaultBands[index] ?? Math.min(index, bands.length - 1)
	);
	const rgbMode = bands.length >= 3 && grid.defaultBands.length !== 1;
	const previewIndices = rgbMode ? rgb : [singleIndex];
	const mapImage = generateThumbnail({
		bands: previewIndices.map(index => bands[index]),
		width,
		height,
		bbox: bounds,
		nodata: NaN,
		ranges: previewIndices.map(index => ranges[index])
	});
	if (mode === 'mesh') {
		if (bands.length !== 1) throw new Error('3Dメッシュは単バンド画像で使用できます');
		const entry = await createRasterMeshEntryInWorker({
			id,
			name,
			band,
			width,
			height,
			nodata: NaN,
			bounds,
			mapImage
		});
		if (signal.aborted) {
			URL.revokeObjectURL(entry.format.url);
			throw new DOMException('Aborted', 'AbortError');
		}
		entry.metaData.attribution = 'ENVI／ESRI BIL';
		return entry;
	}
	try {
		await encodeAllBandsToTerrarium(id, bands, width, height, NaN, ranges);
		if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
		GeoTiffCache.setBbox(id, bounds);
		GeoTiffCache.setRawBbox(id, bounds);
		GeoTiffCache.markAs4326(id);
		const centerLatitude = (bounds[1] + bounds[3]) / 2;
		if (bands.length === 1) {
			GeoTiffCache.setRawSingleBand(id, {
				band: new Float32Array(band),
				nodata: NaN,
				ewres: Math.max(
					0.01,
					(bounds[2] - bounds[0]) * 111320 * Math.cos(centerLatitude * Math.PI / 180)
						/ width
				),
				nsres: Math.max(0.01, (bounds[3] - bounds[1]) * 111320 / height)
			});
		}
		const channel = { index: singleIndex, ...ranges[singleIndex] };
		const entry: RasterImageEntry<RasterTiffStyle> = {
			id,
			type: 'raster',
			format: { type: 'image', url: '' },
			metaData: {
				...DEFAULT_CUSTOM_META_DATA,
				attribution: 'ENVI／ESRI BIL',
				name,
				tileSize: 256,
				bounds,
				xyzImageTile: findCenterTile(bounds),
				mapImage
			},
			properties: { bands: { numBands: bands.length, sampleRanges: ranges } },
			interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
			style: {
				type: 'tiff',
				opacity: 1,
				visible: true,
				visualization: {
					mode: rgbMode ? 'multi' : 'single',
					uniformsData: {
						single: { ...channel, colorMap: 'jet' },
						multi: {
							r: { index: rgb[0], ...ranges[rgb[0]] },
							g: { index: rgb[1], ...ranges[rgb[1]] },
							b: { index: rgb[2], ...ranges[rgb[2]] }
						}
					}
				}
			}
		};
		return entry;
	} catch (error) {
		GeoTiffCache.release(id);
		throw error;
	}
};
