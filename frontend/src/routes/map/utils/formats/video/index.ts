import { createRasterEntry } from '$routes/map/data/entries/raster';
import type { RasterVideoEntry } from '$routes/map/data/types/raster';
import type { GeoRefCorners } from '$routes/map/utils/transform/georef/homography';

/** 動画も画像と同じ四隅・ラスター表示設定で管理する。 */
export const createVideoEntry = (
	name: string,
	url: string,
	bounds: [number, number, number, number],
	corners: GeoRefCorners,
	previewImageUrl?: string
): RasterVideoEntry => {
	const base = createRasterEntry(name, url, { bounds });
	return {
		...base,
		id: `video_${crypto.randomUUID()}`,
		format: { type: 'video', url },
		metaData: {
			...base.metaData,
			attribution: '動画',
			description: '地図上に配置した動画。位置合わせした範囲で映像を再生する。',
			imageCorners: corners.map(([lng, lat]) => [lng, lat]) as GeoRefCorners,
			mapImage: previewImageUrl
		}
	};
};
