import { hasFormatExtension } from '../format-definition';
import type { RasterGrid } from '../raster/grid';
import { formatHgt } from './definition';

export interface HgtGrid extends RasterGrid {
	/** 四隅の標本点の範囲。bboxは半セル外側のピクセル外縁。 */
	sampleBounds: RasterGrid['bbox'] | null;
}

export const isHgtFile = (file: Pick<File, 'name'>): boolean =>
	hasFormatExtension(file.name, formatHgt.extensions);

/** SRTMの1度タイル。高緯度用SRTM-1は経度方向が2秒間隔。 */
export const getHgtDimensions = (byteLength: number): [number, number] => {
	if (byteLength > formatHgt.limits.maxFileBytes) {
		throw new Error(`SRTM HGTは${formatHgt.limits.maxFileBytes}バイト以下にしてください`);
	}
	for (const [width, height] of [[1201, 1201], [1801, 3601], [3601, 3601]]) {
		if (byteLength === width * height * 2) return [width, height];
	}
	throw new Error(
		'SRTM HGTの容量が不正です。1201×1201、1801×3601、3601×3601の16ビット格子に対応しています'
	);
};

export const getHgtSampleBounds = (name: string): RasterGrid['bbox'] | null => {
	const basename = name.split(/[\\/]/).pop() ?? '';
	const match = /^([NS])(\d{2})([EW])(\d{3})(?:\.[^.]+)*\.hgt$/i.exec(basename);
	if (!match) return null;
	const south = Number(match[2]) * (match[1].toUpperCase() === 'S' ? -1 : 1);
	const west = Number(match[4]) * (match[3].toUpperCase() === 'W' ? -1 : 1);
	if (south < -90 || south >= 90 || west < -180 || west >= 180) {
		throw new Error('SRTM HGTのファイル名に含まれる緯度・経度が範囲外です');
	}
	return [west, south, west + 1, south + 1];
};

/** 符号付き16ビットBig Endian、北→南・西→東。-32768のみ欠損値。 */
export const parseHgt = (buffer: ArrayBuffer, name: string): HgtGrid => {
	const [width, height] = getHgtDimensions(buffer.byteLength);
	const sampleBounds = getHgtSampleBounds(name);
	const view = new DataView(buffer);
	const band = new Float64Array(width * height);
	let min = Infinity, max = -Infinity;
	for (let index = 0; index < band.length; index++) {
		const value = view.getInt16(index * 2, false);
		band[index] = value === -32768 ? NaN : value;
		if (value === -32768) continue;
		min = Math.min(min, value);
		max = Math.max(max, value);
	}
	if (!Number.isFinite(min)) throw new Error('SRTM HGTに欠損値以外の標高がありません');
	const dx = 1 / (width - 1), dy = 1 / (height - 1);
	const bbox: RasterGrid['bbox'] = sampleBounds
		? [
			sampleBounds[0] - dx / 2,
			sampleBounds[1] - dy / 2,
			sampleBounds[2] + dx / 2,
			sampleBounds[3] + dy / 2
		]
		: [0, 0, width, height];
	return {
		width,
		height,
		bandCount: 1,
		bands: [band],
		ranges: [{ min, max }],
		bbox,
		sampleBounds,
		transform: sampleBounds ? [bbox[0], dx, 0, bbox[3], 0, -dy] : null,
		crs: 'EPSG:4326',
		defaultBands: [0]
	};
};

export const readHgtFile = async (file: File): Promise<HgtGrid> => {
	getHgtDimensions(file.size);
	return parseHgt(await file.arrayBuffer(), file.name);
};
