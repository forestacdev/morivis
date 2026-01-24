import type { Map as MapLibreMap } from 'maplibre-gl';
import { getWkt, type EpsgCode } from '$routes/map/utils/proj/dict';

/**
 * 画像の統計情報を計算
 */
const calculateImageStatistics = (
	imageData: ImageData,
	bandIndex: number
): {
	min: number;
	max: number;
	mean: number;
	stddev: number;
} => {
	const data = imageData.data;
	let min = 255;
	let max = 0;
	let sum = 0;
	let count = 0;

	// 指定バンドのピクセル値を収集して統計計算 (R=0, G=1, B=2)
	for (let i = bandIndex; i < data.length; i += 4) {
		const value = data[i];

		// 最小・最大値を更新
		if (value < min) min = value;
		if (value > max) max = value;

		// 合計と件数
		sum += value;
		count++;
	}

	// 平均値
	const mean = sum / count;

	// 標準偏差（2回目のループ）
	let varianceSum = 0;
	for (let i = bandIndex; i < data.length; i += 4) {
		const value = data[i];
		varianceSum += Math.pow(value - mean, 2);
	}
	const stddev = Math.sqrt(varianceSum / count);

	return { min, max, mean, stddev };
};

/**
 * GeoTransformパラメータを計算（回転対応）
 */
const calculateGeoTransform = (
	map: MapLibreMap,
	imageWidth: number,
	imageHeight: number
): number[] => {
	const canvas = map.getCanvas();

	// 四隅の座標を取得
	const topLeft = map.unproject([0, 0]);
	const topRight = map.unproject([canvas.width, 0]);
	const bottomLeft = map.unproject([0, canvas.height]);

	const x1 = topLeft.lng;
	const y1 = topLeft.lat;
	const x2 = topRight.lng;
	const y2 = topRight.lat;
	const x3 = bottomLeft.lng;
	const y3 = bottomLeft.lat;

	// アフィン変換パラメータを計算
	// A, D: X方向の変換（1ピクセル右に移動したときの座標変化）
	const A = (x2 - x1) / imageWidth;
	const D = (y2 - y1) / imageWidth;

	// B, E: Y方向の変換（1ピクセル下に移動したときの座標変化）
	const B = (x3 - x1) / imageHeight;
	const E = (y3 - y1) / imageHeight;

	// C, F: 左上ピクセル中心の座標
	const C = x1 + A * 0.5 + B * 0.5;
	const F = y1 + D * 0.5 + E * 0.5;

	// GeoTransform: [originX, pixelWidth, rotationX, originY, rotationY, pixelHeight]
	return [C, A, B, F, D, E];
};

/**
 * PAMDataset (GDAL Auxiliary File) を生成
 */
export const generateAuxXml = async (
	map: MapLibreMap,
	imageDataUrl: string,
	epsg: number = 4326
): Promise<string> => {
	// data URLから画像を読み込んで統計情報を取得
	const img = new Image();
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = reject;
		img.src = imageDataUrl;
	});

	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = img.width;
	tempCanvas.height = img.height;
	const ctx = tempCanvas.getContext('2d');
	if (!ctx) throw new Error('Canvas context取得失敗');

	ctx.drawImage(img, 0, 0);
	const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

	// RGB各バンドの統計を計算
	const redStats = calculateImageStatistics(imageData, 0);
	const greenStats = calculateImageStatistics(imageData, 1);
	const blueStats = calculateImageStatistics(imageData, 2);

	const bands = [
		{ band: 1, stats: redStats },
		{ band: 2, stats: greenStats },
		{ band: 3, stats: blueStats }
	];

	// GeoTransformを計算
	const geoTransform = calculateGeoTransform(map, img.width, img.height);

	// WKT定義を取得
	const wkt = getWkt(epsg.toString() as EpsgCode);

	// XML生成
	let xml = `<PAMDataset>\n`;

	// SRS（座標系）
	xml += `  <SRS dataAxisToSRSAxisMapping="1,2">${wkt}</SRS>\n`;

	// GeoTransform
	xml += `  <GeoTransform>${geoTransform.map((v) => v.toFixed(16)).join(', ')}</GeoTransform>\n`;

	// 画像構造のメタデータ
	xml += `  <Metadata domain="IMAGE_STRUCTURE">\n`;
	xml += `    <MDI key="INTERLEAVE">PIXEL</MDI>\n`;
	xml += `  </Metadata>\n`;

	// 追加メタデータ
	xml += `  <Metadata>\n`;
	xml += `    <MDI key="AREA_OR_POINT">Area</MDI>\n`;
	xml += `  </Metadata>\n`;

	// 各バンドの統計情報
	bands.forEach(({ band, stats }) => {
		const bandName = band === 1 ? 'Red' : band === 2 ? 'Green' : 'Blue';
		xml += `  <PAMRasterBand band="${band}">\n`;
		xml += `    <Description>${bandName}</Description>\n`;
		xml += `    <Metadata>\n`;
		xml += `      <MDI key="STATISTICS_APPROXIMATE">YES</MDI>\n`;
		xml += `      <MDI key="STATISTICS_MAXIMUM">${Math.round(stats.max)}</MDI>\n`;
		xml += `      <MDI key="STATISTICS_MEAN">${stats.mean.toFixed(12)}</MDI>\n`;
		xml += `      <MDI key="STATISTICS_MINIMUM">${Math.round(stats.min)}</MDI>\n`;
		xml += `      <MDI key="STATISTICS_STDDEV">${stats.stddev.toFixed(12)}</MDI>\n`;
		xml += `      <MDI key="STATISTICS_VALID_PERCENT">100</MDI>\n`;
		xml += `    </Metadata>\n`;
		xml += `  </PAMRasterBand>\n`;
	});

	xml += `</PAMDataset>`;

	return xml;
};

/**
 * .aux.xmlファイルをダウンロード
 */
export const downloadAuxXml = async (
	map: MapLibreMap,
	imageDataUrl: string,
	epsg: number = 4326,
	filename: string = 'map.png.aux.xml'
) => {
	const xmlContent = await generateAuxXml(map, imageDataUrl, epsg);

	const blob = new Blob([xmlContent], { type: 'application/xml' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};
