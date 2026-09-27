import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
import { encodeAllBandsToTerrarium } from '$routes/map/utils/formats/geotiff';
import { createRasterMeshEntryInWorker } from '$routes/map/utils/formats/geotiff/mesh-parallel';
import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';
import { findCenterTile } from '$routes/map/utils/map/tile';
import type { AsciiGrid } from '.';

/** WGS84の等間隔格子を既存の1バンドラスター／メッシュentryへ渡す。 */
export const createAsciiGridEntry = async (
	grid: AsciiGrid,
	name: string,
	mode: 'raster' | 'mesh',
	signal: AbortSignal
) => {
	const id = `ascii_grid_${crypto.randomUUID()}`;
	const { band, width, height, bbox: bounds, range } = grid;
	const mapImage = generateThumbnail({
		bands: [band],
		width,
		height,
		bbox: bounds,
		nodata: NaN,
		ranges: [range]
	});
	if (mode === 'mesh') {
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
		entry.metaData.attribution = 'ASCII Grid';
		return entry;
	}
	try {
		await encodeAllBandsToTerrarium(id, [band], width, height, NaN, [range]);
		if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
		GeoTiffCache.setBbox(id, bounds);
		GeoTiffCache.setRawBbox(id, bounds);
		GeoTiffCache.markAs4326(id);
		const centerLatitude = (bounds[1] + bounds[3]) / 2;
		GeoTiffCache.setRawSingleBand(id, {
			band: new Float32Array(band),
			nodata: NaN,
			ewres: Math.max(
				0.01,
				(bounds[2] - bounds[0]) * 111320 * Math.cos(centerLatitude * Math.PI / 180) / width
			),
			nsres: Math.max(0.01, (bounds[3] - bounds[1]) * 111320 / height)
		});
		const channel = { index: 0, ...range };
		const entry: RasterImageEntry<RasterTiffStyle> = {
			id,
			type: 'raster',
			format: { type: 'image', url: '' },
			metaData: {
				...DEFAULT_CUSTOM_META_DATA,
				attribution: 'ASCII Grid',
				name,
				tileSize: 256,
				bounds,
				xyzImageTile: findCenterTile(bounds),
				mapImage
			},
			properties: { bands: { numBands: 1 } },
			interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
			style: {
				type: 'tiff',
				opacity: 1,
				visible: true,
				visualization: {
					mode: 'single',
					uniformsData: {
						single: { ...channel, colorMap: 'jet' },
						multi: { r: { ...channel }, g: { ...channel }, b: { ...channel } }
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
