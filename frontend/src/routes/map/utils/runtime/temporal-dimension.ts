import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
import type {
	MorivisRasterEntry,
	RasterBaseMapStyle,
	RasterCadStyle,
	RasterCategoricalStyle,
	RasterDemStyle,
	RasterImageEntry,
	RasterTiffStyle
} from '$routes/map/data/types/raster';
import type {
	GeoJsonMetaData,
	MorivisVectorEntry,
	TileMetaData
} from '$routes/map/data/types/vector';
import {
	getRasterDimension,
	getRasterDimensionRuntimeUpdates
} from '$routes/map/utils/raster/dimension-runtime';
import { getRasterTiffImageSource } from '$routes/map/utils/sources/prepare';
import {
	getVectorDimension,
	getVectorDimensionRuntimeUpdates
} from '$routes/map/utils/vector/dimension-runtime';
import { mapStore } from '$routes/stores/map';

type DimensionEnabledRasterEntry = MorivisRasterEntry<
	RasterCategoricalStyle | RasterBaseMapStyle | RasterDemStyle | RasterTiffStyle | RasterCadStyle
>;

type DimensionEnabledVectorEntry = MorivisVectorEntry<GeoJsonMetaData | TileMetaData>;

export type DimensionEnabledEntry =
	| DimensionEnabledRasterEntry
	| DimensionEnabledVectorEntry
	| MeshEntry<MeshStyle>;

const isRasterEntry = (entry: DimensionEnabledEntry): entry is DimensionEnabledRasterEntry =>
	entry.type === 'raster';

const isSourceTemporalVectorEntry = (
	entry: DimensionEnabledEntry
): entry is DimensionEnabledVectorEntry =>
	entry.type === 'vector' && Boolean(getVectorDimension(entry));

const isTemporalMeshEntry = (entry: DimensionEnabledEntry): entry is MeshEntry<MeshStyle> =>
	entry.type === 'model'
	&& entry.style.type === 'mesh'
	&& Boolean(entry.properties?.temporal?.dimension);

export const getDimension = (entry: DimensionEnabledEntry) => {
	if (isRasterEntry(entry)) return getRasterDimension(entry);
	if (isSourceTemporalVectorEntry(entry)) return getVectorDimension(entry);
	if (isTemporalMeshEntry(entry)) return entry.properties?.temporal?.dimension;
	return undefined;
};

/** 時刻選択に必要なsource更新をまとめ、後続選択や破棄で古い結果を失効させる。 */
export const createDimensionController = (getEntry: () => DimensionEnabledEntry) => {
	let requestId = 0;
	let disposed = false;
	const select = async (currentIndex: number) => {
		const entry = getEntry();
		const dimension = getDimension(entry);
		if (
			disposed || !dimension || !Number.isInteger(currentIndex) || currentIndex < 0
			|| currentIndex >= dimension.values.length
		) return;
		if (currentIndex === entry.state?.dimension?.currentIndex) return;
		const request = ++requestId;
		const map = mapStore.getMap();
		const isCurrent = () =>
			!disposed && request === requestId && getEntry() === entry && mapStore.getMap() === map
			&& entry.state?.dimension?.currentIndex === currentIndex;
		if (isTemporalMeshEntry(entry)) {
			await mapStore.setTemporalModelTimeStep(entry, currentIndex);
			return;
		}
		entry.state = { ...entry.state, dimension: { currentIndex } };
		if (isSourceTemporalVectorEntry(entry)) {
			const updates = await getVectorDimensionRuntimeUpdates(entry, { isCurrent });
			if (!isCurrent()) return;
			updates.forEach((update) => mapStore.setData(update.sourceId, update.data));
			return;
		}
		if (!isRasterEntry(entry)) return;
		getRasterDimensionRuntimeUpdates(entry).forEach((update) => {
			if (update.type === 'tiles') mapStore.setTiles(update.sourceId, update.tiles);
			else mapStore.setData(update.sourceId, update.data);
		});
		if (entry.style.type !== 'tiff' || entry.format.type !== 'image') return;
		// バンド範囲と画像の準備は通常のstyle生成と同じ処理を使う。
		const image = await getRasterTiffImageSource(entry as RasterImageEntry<RasterTiffStyle>, {
			isCurrent
		});
		if (!image?.url || !isCurrent()) return;
		mapStore.setImage(`${entry.id}_source`, { url: image.url, coordinates: image.coordinates });
	};
	return {
		select,
		dispose: () => {
			disposed = true;
			requestId += 1;
		}
	};
};
