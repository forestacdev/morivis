import type { Map as MapLibreMap } from 'maplibre-gl';

// 縮尺を計算する関数 MaplibreのScaleControlを参考
// https://github.com/maplibre/maplibre-gl-js/blob/53cb7999de2c3608f3e35cf3d6d35de5f106dcdf/src/ui/control/scale_control.ts
export const getMapScale = (map: MapLibreMap): number => {
	// 画面中央の座標を取得
	const y = map.getContainer().clientHeight / 2;
	const x = map.getContainer().clientWidth / 2;

	const optWidth = 100;

	// 中央から左右にoptWidth/2ピクセルずつずらした点
	const left = map.unproject([x - optWidth / 2, y]);
	const right = map.unproject([x + optWidth / 2, y]);

	// グローブ投影時の実際のピクセル幅を計算
	const globeWidth = Math.round(map.project(right).x - map.project(left).x);
	const actualWidth = Math.min(optWidth, globeWidth, map.getContainer().clientWidth);

	// actualWidthピクセル分の実際の距離(メートル)
	const distanceMeters = left.distanceTo(right);

	// 1ピクセルあたりのメートル数
	const metersPerPixel = distanceMeters / actualWidth;

	// 縮尺の計算
	// 1インチ = 0.0254メートル (定義値)
	// 画面解像度 = 96 DPI (dots per inch) を想定
	// 縮尺 = 地図上1インチの実距離 / 実際の1インチ
	//      = (メートル/ピクセル × 96ピクセル/インチ) / 0.0254メートル/インチ
	const METERS_PER_INCH = 0.0254;
	const SCREEN_DPI = 96;
	const scale = (metersPerPixel * SCREEN_DPI) / METERS_PER_INCH;

	return Math.round(scale);
};
