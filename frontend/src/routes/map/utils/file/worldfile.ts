import type { Map } from 'maplibre-gl';

/**
 * MapLibreの現在のbboxからワールドファイルのパラメータを生成
 * @param map MapLibreのMapインスタンス
 * @param imageWidth 出力画像の幅(px)
 * @param imageHeight 出力画像の高さ(px)
 * @returns ワールドファイルの6行のパラメータ
 */
export const generateWorldFile = (map: Map, imageWidth: number, imageHeight: number): string => {
	const bounds = map.getBounds();

	// 西端、南端、東端、北端の座標を取得
	const west = bounds.getWest();
	const south = bounds.getSouth();
	const east = bounds.getEast();
	const north = bounds.getNorth();

	// X方向のピクセルサイズ(経度の幅 / 画像の幅)
	const pixelSizeX = (east - west) / imageWidth;

	// Y方向のピクセルサイズ(緯度の幅 / 画像の高さ) - 負の値
	const pixelSizeY = -(north - south) / imageHeight;

	// 回転パラメータ(通常は0)
	const rotationX = 0;
	const rotationY = 0;

	// 左上ピクセルの中心のX座標(西端 + ピクセルサイズの半分)
	const upperLeftX = west + pixelSizeX / 2;

	// 左上ピクセルの中心のY座標(北端 + ピクセルサイズの半分)
	// pixelSizeYは負なので、実質的には北端 - |pixelSizeY| / 2
	const upperLeftY = north + pixelSizeY / 2;

	// ワールドファイルの形式(6行)
	return [
		pixelSizeX.toFixed(10), // Line 1: X方向のピクセルサイズ
		rotationX.toFixed(10), // Line 2: Y軸方向の回転
		rotationY.toFixed(10), // Line 3: X軸方向の回転
		pixelSizeY.toFixed(10), // Line 4: Y方向のピクセルサイズ(負)
		upperLeftX.toFixed(10), // Line 5: 左上ピクセル中心のX座標
		upperLeftY.toFixed(10) // Line 6: 左上ピクセル中心のY座標
	].join('\n');
};

/**
 * ワールドファイルをダウンロード
 */
export const downloadWorldFile = (
	map: Map,
	imageWidth: number,
	imageHeight: number,
	filename: string = 'map.pgw'
) => {
	const worldFileContent = generateWorldFile(map, imageWidth, imageHeight);

	const blob = new Blob([worldFileContent], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};
