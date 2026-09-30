import { getAdjustableRangeValue, type MorivisLayerEntry } from '$routes/map/data/types';
import type { RasterGeoZarrEntry, RasterTiffStyle } from '$routes/map/data/types/raster';

export type GeoZarrVoxelEntry = RasterGeoZarrEntry<RasterTiffStyle>;
export const isGeoZarrVoxelEntry = (entry: MorivisLayerEntry): entry is GeoZarrVoxelEntry =>
	entry.type === 'raster' && entry.format.type === 'geozarr' && entry.style.type === 'tiff'
	&& entry.style.volume?.type === 'voxel';
export const createVoxelSpec = (entry: GeoZarrVoxelEntry) => {
	const band = entry.style.visualization.uniformsData.single;
	const [min, max] = getAdjustableRangeValue(band.range, band.min, band.max);
	return {
		id: entry.id, url: entry.format.url, arrayPath: entry.format.arrayPath,
		visible: entry.style.visible, opacity: entry.style.opacity,
		colorMap: band.colorMap, min, max,
		threshold: Math.max(0, entry.style.volume?.threshold ?? 0),
		heightScale: Math.max(0.1, Math.min(20, entry.style.volume?.heightScale ?? 1))
	};
};
export type VoxelSpec = ReturnType<typeof createVoxelSpec>;
