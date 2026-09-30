import { formatGeoZarr } from '$routes/map/utils/formats/geozarr/definition';
import type { GpmLayout } from './gpm';

export type VoxelRegionData = {
	/** 地域中央からのMercator差分。1セルにつきx,y,z,dx,dy,dz,value。 */
	cells: Float32Array;
	anchor: [number, number];
};
export type VoxelRegionRequest = {
	entryId: string; url: string; arrayPath?: string;
	region: number; overview: boolean;
};
const mx = (lon: number) => (lon + 180) / 360;
const my = (lat: number) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2;
/** 正の観測値だけ箱にする。値0は空間を埋めない。地域単位で間引かず、上限時はエラーにする。 */
export const createVoxelCells = (layout: GpmLayout, regionIndex: number, values: ArrayLike<number>): VoxelRegionData => {
	const region = layout.regions[regionIndex];
	if (!region || !layout.height) throw new Error('Zarrにボクセル表示用の高度情報がありません');
	const b = region.bounds, [nx, ny, nz] = layout.dimensions;
	if (values.length !== nx * ny * nz) throw new Error('Zarrのボクセルチャンク長が不正です');
	if (b.minHeight === undefined || b.maxHeight === undefined || b.south <= -85 || b.north >= 85) {
		throw new Error('Zarrのボクセル座標範囲に対応していません');
	}
	let count = 0;
	for (let i = 0; i < values.length; i++) if (Number.isFinite(values[i]) && values[i] > 0 && values[i] !== layout.noData) count++;
	if (count > formatGeoZarr.limits.maxVoxelsPerRegion) throw new Error('地域のボクセル数が上限を超えました。overview配列を選んでください');
	const cells = new Float32Array(count * 7);
	const anchor: [number, number] = [mx((b.west + b.east) / 2), my((b.south + b.north) / 2)];
	const dx = (b.east - b.west) / nx / 360, dy = (b.north - b.south) / ny;
	const dz = (b.maxHeight - b.minHeight) / nz;
	let cursor = 0;
	for (let y = 0; y < ny; y++) {
		const south = b.south + y * dy, north = south + dy;
		const top = my(north), bottom = my(south);
		const scale = 1 / (2 * Math.PI * 6371008.8 * Math.cos((north + south) / 2 * Math.PI / 180));
		for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
			const value = values[x + nx * (y + ny * z)];
			if (!Number.isFinite(value) || value <= 0 || value === layout.noData) continue;
			cells.set([mx(b.west) + (x + 0.5) * dx - anchor[0], (top + bottom) / 2 - anchor[1],
				(b.minHeight + (z + 0.5) * dz) * scale, dx, bottom - top, dz * scale, value], cursor);
			cursor += 7;
		}
	}
	return { cells, anchor };
};
