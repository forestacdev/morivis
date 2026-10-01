import proj4 from 'proj4';
import type { AsciiGrid } from '.';

const MAX_LATITUDE = 85.0511287798066;

/** bboxだけでなくセルも逆投影する。最近傍で値と欠損領域を保つ。 */
export const projectAsciiGrid = (grid: AsciiGrid, sourceCrs: string): AsciiGrid => {
	if (!sourceCrs.trim()) throw new Error('ASCII Gridの座標系を指定してください');
	let converter: proj4.Converter;
	try {
		converter = proj4(sourceCrs, 'EPSG:4326');
	} catch {
		throw new Error('座標系を解釈できません。PRJを確認するか、座標系を選択してください');
	}
	const [west, south, east, north] = grid.bbox;
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	const edges = [
		[[west, south], [east, south]],
		[[east, south], [east, north]],
		[[east, north], [west, north]],
		[[west, north], [west, south]]
	];
	for (const [start, end] of edges) {
		let previousLongitude: number | undefined;
		for (let i = 0; i <= 64; i++) {
			const [lng, lat] = converter.forward([
				start[0] + (end[0] - start[0]) * i / 64,
				start[1] + (end[1] - start[1]) * i / 64
			]);
			if (
				![lng, lat].every(Number.isFinite) || Math.abs(lng) > 180.000001
				|| Math.abs(lat) > 90.000001
			) {
				throw new Error('座標変換の結果が地図の範囲外です。座標系を確認してください');
			}
			if (previousLongitude !== undefined && Math.abs(lng - previousLongitude) > 180) {
				throw new Error('日付変更線をまたぐASCII Gridは分割して読み込んでください');
			}
			previousLongitude = lng;
			minX = Math.min(minX, lng);
			maxX = Math.max(maxX, lng);
			minY = Math.min(minY, lat);
			maxY = Math.max(maxY, lat);
		}
	}
	minX = Math.max(-180, minX);
	maxX = Math.min(180, maxX);
	minY = Math.max(-MAX_LATITUDE, minY);
	maxY = Math.min(MAX_LATITUDE, maxY);
	if (!(minX < maxX && minY < maxY)) {
		throw new Error('ASCII Gridに表示可能な座標範囲がありません');
	}
	const dx = (maxX - minX) / grid.width;
	const dy = (maxY - minY) / grid.height;
	const band = new Float64Array(grid.band.length).fill(NaN);
	let min = Infinity, max = -Infinity;
	for (let row = 0; row < grid.height; row++) {
		for (let column = 0; column < grid.width; column++) {
			const [x, y] = converter.inverse([minX + (column + 0.5) * dx, maxY - (row + 0.5) * dy]);
			const sourceColumn = Math.floor((x - west) / grid.cellSize[0]);
			const sourceRow = Math.floor((north - y) / grid.cellSize[1]);
			if (
				sourceColumn < 0 || sourceRow < 0 || sourceColumn >= grid.width
				|| sourceRow >= grid.height
			) continue;
			const value = grid.band[sourceRow * grid.width + sourceColumn];
			if (!Number.isFinite(value)) continue;
			band[row * grid.width + column] = value;
			min = Math.min(min, value);
			max = Math.max(max, value);
		}
	}
	if (!Number.isFinite(min)) {
		throw new Error('座標変換後に有効なセルがありません。座標系を確認してください');
	}
	return {
		...grid,
		band,
		bbox: [minX, minY, maxX, maxY],
		cellSize: [dx, dy],
		range: { min, max }
	};
};
