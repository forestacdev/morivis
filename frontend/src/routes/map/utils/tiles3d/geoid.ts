/** GSJ「日本のジオイド2011」数値PNG。通常のDEMと異なり単位は0.0001 m。
 * https://tiles.gsj.jp/tiles/elev/tiles.html#gsigeoid
 */
export const decodeGeoidPixel = (rgba: ArrayLike<number>): number | null => {
	if (rgba.length < 4 || rgba[3] !== 255) return null;
	const value = rgba[0] * 65536 + rgba[1] * 256 + rgba[2];
	if (value === 8388608) return null;
	return (value < 8388608 ? value : value - 16777216) * 0.0001;
};

export const getGeoidTilePosition = (lng: number, lat: number) => {
	if (
		!Number.isFinite(lng) || !Number.isFinite(lat)
		|| lng < 120 || lng > 150 || lat < 20 || lat > 50
	) {
		throw new Error('日本のジオイド2011の提供範囲外です。高さを手動で調整してください。');
	}
	const size = 256;
	const zoom = 8;
	const scale = size * 2 ** zoom;
	const sinLat = Math.sin(lat * Math.PI / 180);
	const pixelX = Math.floor((lng + 180) / 360 * scale);
	const pixelY = Math.floor(
		(0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
	);
	return {
		url: `https://tiles.gsj.jp/tiles/elev/gsigeoid/${zoom}/${Math.floor(pixelY / size)}/${
			Math.floor(pixelX / size)
		}.png`,
		x: pixelX % size,
		y: pixelY % size
	};
};

/** レイヤー中央の近傍1画素を使う概算。広域の高さ基準変換には使わない。 */
export const fetchGeoidHeight = async (lng: number, lat: number): Promise<number> => {
	const { url, x, y } = getGeoidTilePosition(lng, lat);
	const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
	if (!response.ok) throw new Error(`ジオイド高の取得に失敗しました (${response.status})。`);
	const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none' });
	try {
		const canvas = new OffscreenCanvas(256, 256);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('ジオイド高の画像を読み取れませんでした。');
		context.drawImage(bitmap, 0, 0);
		const height = decodeGeoidPixel(context.getImageData(x, y, 1, 1).data);
		if (height === null) {
			throw new Error('この地点のジオイド高がありません。高さを手動で調整してください。');
		}
		return height;
	} finally {
		bitmap.close();
	}
};
