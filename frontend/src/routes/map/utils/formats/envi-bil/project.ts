import proj4 from 'proj4';
import type { RawRaster } from '.';

/** 回転を含む元格子のセルへ逆投影し、バンドごとの値・欠損を最近傍で保つ。 */
export const projectRawRaster = (grid: RawRaster, sourceCrs: string): RawRaster => {
	if (!sourceCrs.trim()) throw new Error('座標系を選択してください');
	if (!grid.transform) {
		throw new Error('画像の位置情報がありません。位置合わせを使用してください');
	}
	let converter: proj4.Converter;
	try {
		converter = proj4(sourceCrs, 'EPSG:4326');
	} catch {
		throw new Error('座標系を解釈できません。座標系を選択してください');
	}
	const [x0, a, b, y0, c, d] = grid.transform;
	const det = a * d - b * c;
	let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
	const corners = [[0, 0], [grid.width, 0], [grid.width, grid.height], [0, grid.height], [0, 0]];
	for (let edge = 0; edge < 4; edge++) {
		let previous: number | undefined;
		for (let i = 0; i <= 64; i++) {
			const column = corners[edge][0] + (corners[edge + 1][0] - corners[edge][0]) * i / 64;
			const row = corners[edge][1] + (corners[edge + 1][1] - corners[edge][1]) * i / 64;
			const [lng, lat] = converter.forward([
				x0 + a * column + b * row,
				y0 + c * column + d * row
			]);
			if (
				!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180.000001
				|| Math.abs(lat) > 90.000001
			) throw new Error('変換後の座標が地図の範囲外です。座標系を確認してください');
			if (previous !== undefined && Math.abs(lng - previous) > 180) {
				throw new Error('日付変更線をまたぐ画像は分割して読み込んでください');
			}
			previous = lng;
			west = Math.min(west, lng);
			east = Math.max(east, lng);
			south = Math.min(south, lat);
			north = Math.max(north, lat);
		}
	}
	west = Math.max(-180, west);
	east = Math.min(180, east);
	south = Math.max(-85.0511287798066, south);
	north = Math.min(85.0511287798066, north);
	if (!(west < east && south < north)) throw new Error('画像に表示できる座標範囲がありません');
	const dx = (east - west) / grid.width, dy = (north - south) / grid.height;
	const bands = grid.bands.map(band => new Float64Array(band.length).fill(NaN));
	const ranges = grid.bands.map(() => ({ min: Infinity, max: -Infinity }));
	let valid = false;
	for (let row = 0; row < grid.height; row++) {
		for (let column = 0; column < grid.width; column++) {
			const [x, y] = converter.inverse([
				west + (column + 0.5) * dx,
				north - (row + 0.5) * dy
			]);
			const sx = Math.floor((d * (x - x0) - b * (y - y0)) / det);
			const sy = Math.floor((-c * (x - x0) + a * (y - y0)) / det);
			if (
				![sx, sy].every(Number.isFinite) || sx < 0 || sy < 0 || sx >= grid.width
				|| sy >= grid.height
			) {
				continue;
			}
			for (let band = 0; band < bands.length; band++) {
				const value = grid.bands[band][sy * grid.width + sx];
				if (!Number.isFinite(value)) continue;
				bands[band][row * grid.width + column] = value;
				ranges[band].min = Math.min(ranges[band].min, value);
				ranges[band].max = Math.max(ranges[band].max, value);
				valid = true;
			}
		}
	}
	if (!valid) throw new Error('座標変換後に有効なセルがありません。座標系を確認してください');
	return {
		...grid,
		bands,
		ranges: ranges.map(range => Number.isFinite(range.min) ? range : { min: 0, max: 1 }),
		bbox: [west, south, east, north],
		transform: [west, dx, 0, north, 0, -dy],
		crs: 'EPSG:4326'
	};
};
