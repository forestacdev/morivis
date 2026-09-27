import { type Coordinates, Evented, ImageSource, MercatorCoordinate } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';

class TestEvented extends Evented {}

// 架空の正方形。実在の画像・座標データは使わない。
const cornersAtZoom = (zoom: number): Coordinates => {
	const halfWidth = 0.375 * 2 ** -zoom;
	return [
		[0.375 - halfWidth, 0.375 - halfWidth],
		[0.375 + halfWidth, 0.375 - halfWidth],
		[0.375 + halfWidth, 0.375 + halfWidth],
		[0.375 - halfWidth, 0.375 + halfWidth]
	].map(([x, y]) => new MercatorCoordinate(x, y).toLngLat().toArray()) as Coordinates;
};

const createSource = (coordinates: Coordinates) =>
	// setCoordinatesは地図への追加・画像取得・Dispatcherを必要としない。
	new ImageSource(
		'test-small-dem',
		{ type: 'image', url: '', coordinates },
		undefined!,
		new TestEvented()
	);

describe('MapLibre image source zoom patch', () => {
	it.each([26, 27, 30])('ズーム%d相当の小さな画像を位置・大きさを変えずに読み込む', zoom => {
		const coordinates = cornersAtZoom(zoom);
		const source = createSource(coordinates);
		expect(() => source.setCoordinates(coordinates)).not.toThrow();
		expect(source.tileID.z).toBe(25);
		expect(source.minzoom).toBe(25);
		expect(source.maxzoom).toBe(25);
		expect(source.serialize().coordinates).toEqual(coordinates);
		expect(
			source.tileCoords.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))
		).toBe(true);
	});

	it('通常範囲の計算を保ち、座標の更新時も上限を守る', () => {
		const coordinates = cornersAtZoom(12);
		const source = createSource(coordinates);
		source.setCoordinates(coordinates);
		expect(source.tileID.z).toBe(12);
		source.setCoordinates(cornersAtZoom(27));
		expect(source.tileID.z).toBe(25);
		source.setCoordinates(coordinates);
		expect(source.tileID.z).toBe(12);
	});
});
