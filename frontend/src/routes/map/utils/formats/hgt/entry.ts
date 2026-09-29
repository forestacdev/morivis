import { createRawRasterEntry } from '../envi-bil/entry';
import type { HgtGrid } from '.';

/** ラスターはピクセル外縁、メッシュは端の標本点を四隅として渡す。 */
export const createHgtEntry = (
	grid: HgtGrid,
	name: string,
	mode: 'raster' | 'mesh',
	signal: AbortSignal
) => {
	if (!grid.sampleBounds) throw new Error('位置情報がありません。位置合わせを使用してください');
	if (grid.bbox[1] < -85.0511287798066 || grid.bbox[3] > 85.0511287798066) {
		throw new Error('Web Mercatorで表示できる緯度範囲を超えています');
	}
	return createRawRasterEntry(
		mode === 'mesh' ? { ...grid, bbox: grid.sampleBounds } : grid,
		name,
		mode,
		signal,
		'SRTM HGT'
	);
};
