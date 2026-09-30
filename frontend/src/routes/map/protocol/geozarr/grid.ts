import proj4, { type Converter } from 'proj4';

const projections = new Map<string, Converter>();

export interface GeoZarrGrid {
	bbox: [number, number, number, number];
	projection: string;
	xDescending: boolean;
	yAscending: boolean;
}

/** 座標値はセル中心。端を半セル外へ広げ、並び順を保持する。 */
export const coordinateAxis = (values: number[]) => {
	if (values.length < 2 || !values.every(Number.isFinite)) {
		throw new Error('Zarrの座標軸が不正です。');
	}
	const step = (values[values.length - 1] - values[0]) / (values.length - 1);
	if (
		!step
		|| values.some((v, i) => Math.abs(v - (values[0] + i * step)) > Math.abs(step) * 0.001)
	) {
		throw new Error('不等間隔・曲線座標のZarrは未対応です。規則格子へ変換してください。');
	}
	return {
		min: Math.min(values[0], values[values.length - 1]) - Math.abs(step) / 2,
		max: Math.max(values[0], values[values.length - 1]) + Math.abs(step) / 2,
		descending: step < 0
	};
};

export const tileLatitude = (y: number, z: number, row: number, size: number) =>
	Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + (row + 0.5) / size) / 2 ** z))) * 180 / Math.PI;

/** bboxの四隅だけで引き伸ばさず、各画素を元の座標系へ戻す。 */
export const gridPixel = (
	grid: GeoZarrGrid,
	width: number,
	height: number,
	lon: number,
	lat: number
): [number, number] | null => {
	const geographic = grid.projection === 'EPSG:4326';
	let projection = projections.get(grid.projection);
	if (!geographic && !projection) {
		projection = proj4('EPSG:4326', grid.projection);
		projections.set(grid.projection, projection);
	}
	const point = geographic ? [lon, lat] : projection!.forward([lon, lat]);
	let x = point[0];
	const y = point[1];
	const [west, south, east, north] = grid.bbox;
	if (geographic) x += 360 * Math.round(((west + east) / 2 - x) / 360);
	if (
		!Number.isFinite(x) || !Number.isFinite(y) || x < west || x >= east || y < south
		|| y >= north
	) return null;
	let column = Math.floor((x - west) / (east - west) * width);
	let row = Math.floor((north - y) / (north - south) * height);
	row = Math.min(height - 1, row);
	if (grid.xDescending) column = width - 1 - column;
	if (grid.yAscending) row = height - 1 - row;
	return [column, row];
};

export const tileGridWindow = (
	grid: GeoZarrGrid,
	width: number,
	height: number,
	x: number,
	y: number,
	z: number,
	size: number
) => {
	let xStart = width, xEnd = 0, yStart = height, yEnd = 0;
	// 描画する全画素と同じ変換を使い、再投影や日付変更線で必要範囲を落とさない。
	for (let row = 0; row < size; row++) {
		const lat = tileLatitude(y, z, row, size);
		for (let col = 0; col < size; col++) {
			const pixel = gridPixel(
				grid,
				width,
				height,
				(x + (col + 0.5) / size) / 2 ** z * 360 - 180,
				lat
			);
			if (!pixel) continue;
			xStart = Math.min(xStart, pixel[0]);
			xEnd = Math.max(xEnd, pixel[0] + 1);
			yStart = Math.min(yStart, pixel[1]);
			yEnd = Math.max(yEnd, pixel[1] + 1);
		}
	}
	return xEnd > xStart && yEnd > yStart ? { xStart, xEnd, yStart, yEnd } : null;
};
