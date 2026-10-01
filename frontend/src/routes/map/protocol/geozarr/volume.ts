import { formatGeoZarr } from '$routes/map/utils/formats/geozarr/definition';
import type { GpmLayout } from './gpm';

export type VolumeRegionData = {
	values: Float32Array<ArrayBuffer>;
	dimensions: [number, number, number];
	bounds: [number, number, number, number, number, number];
	anchor: [number, number];
};

/** x-fastestの格子を保持する。0・欠損は透明、観測値の単位は変えない。 */
export const createVolumeData = (
	layout: GpmLayout,
	index: number,
	input: ArrayLike<number>
): VolumeRegionData => {
	const region = layout.regions[index];
	if (!region || !layout.height) throw new Error('Zarrにボリューム表示用の高度情報がありません');
	const b = region.bounds, [nx, ny, nz] = layout.dimensions;
	if (input.length !== nx * ny * nz) throw new Error('Zarrのボリュームチャンク長が不正です');
	if (input.length > formatGeoZarr.limits.maxSamples) {
		throw new Error('ボリュームの格子数が上限を超えました');
	}
	if (b.minHeight === undefined || b.maxHeight === undefined || b.south <= -85 || b.north >= 85) {
		throw new Error('Zarrのボリューム座標範囲に対応していません');
	}
	const values = Float32Array.from(
		input,
		v => Number.isFinite(v) && v > 0 && v !== layout.noData ? v : 0
	);
	const latitude = (b.south + b.north) / 2 * Math.PI / 180;
	return {
		values,
		dimensions: [nx, ny, nz],
		bounds: [b.west, b.south, b.east, b.north, b.minHeight, b.maxHeight],
		anchor: [(b.west + b.east + 360) / 720, (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2]
	};
};
