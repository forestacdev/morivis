import { getWkt, isValidEpsg, type EpsgCode } from '$routes/map/utils/proj/dict';

// ============================
// aux.xml パース
// ============================

/**
 * aux.xmlファイルからEPSGコードを抽出する
 * SRS内の AUTHORITY["EPSG","XXXX"] パターンからトップレベルのEPSGコードを取得
 */
export const parseEpsgFromAuxXml = (xmlContent: string): EpsgCode | null => {
	// SRSタグの中身を取得
	const srsMatch = xmlContent.match(/<SRS[^>]*>([\s\S]*?)<\/SRS>/);
	if (!srsMatch) return null;

	const srs = srsMatch[1];

	// AUTHORITY["EPSG","XXXX"] の最後のもの（トップレベルの座標系）を取得
	const authorityMatches = [...srs.matchAll(/AUTHORITY\["EPSG","(\d+)"\]/g)];
	if (authorityMatches.length === 0) return null;

	const epsgCode = authorityMatches[authorityMatches.length - 1][1];
	if (isValidEpsg(epsgCode)) {
		return epsgCode as EpsgCode;
	}

	return null;
};

/**
 * aux.xmlからGeoTransformを読み取り、画像サイズからbboxを計算する
 */
export const parseBboxFromAuxXml = (
	xmlContent: string,
	width: number,
	height: number
): [number, number, number, number] | null => {
	const gtMatch = xmlContent.match(/<GeoTransform>([\s\S]*?)<\/GeoTransform>/);
	if (!gtMatch) return null;

	const values = gtMatch[1].split(',').map((v) => parseFloat(v.trim()));
	if (values.length < 6 || values.some((v) => !Number.isFinite(v))) return null;

	// GeoTransform: [originX, pixelWidth, rotationX, originY, rotationY, pixelHeight]
	const [originX, pixelWidth, , originY, , pixelHeight] = values;

	// ピクセル中心からピクセル端に補正
	const minX = originX - pixelWidth * 0.5;
	const maxY = originY - pixelHeight * 0.5;
	const maxX = minX + pixelWidth * width;
	const minY = maxY + pixelHeight * height; // pixelHeightは負

	return [minX, minY, maxX, maxY];
};

// ============================
// GeoTransform 計算
// ============================

/**
 * bboxとサイズからGeoTransformパラメータを計算（回転なし）
 */
export const calculateGeoTransformFromBbox = (
	bbox: [number, number, number, number],
	width: number,
	height: number
): number[] => {
	const [minLng, minLat, maxLng, maxLat] = bbox;
	const pixelWidth = (maxLng - minLng) / width;
	const pixelHeight = (minLat - maxLat) / height; // 負の値
	return [minLng + pixelWidth * 0.5, pixelWidth, 0, maxLat + pixelHeight * 0.5, 0, pixelHeight];
};

// ============================
// aux.xml 生成
// ============================

interface BandStats {
	band: number;
	name: string;
	min: number;
	max: number;
	mean: number;
	stddev: number;
}

/**
 * PAMDataset XML を生成する共通関数
 * bandStats を渡せば統計情報付き、省略すれば最小限のXMLを生成
 */
export const buildAuxXml = (
	geoTransform: number[],
	epsg: number = 4326,
	bandStats?: BandStats[]
): string => {
	const wkt = getWkt(epsg.toString() as EpsgCode);

	let xml = `<PAMDataset>\n`;
	xml += `  <SRS dataAxisToSRSAxisMapping="1,2">${wkt}</SRS>\n`;
	xml += `  <GeoTransform>${geoTransform.map((v) => v.toFixed(16)).join(', ')}</GeoTransform>\n`;

	if (bandStats && bandStats.length > 0) {
		xml += `  <Metadata domain="IMAGE_STRUCTURE">\n`;
		xml += `    <MDI key="INTERLEAVE">PIXEL</MDI>\n`;
		xml += `  </Metadata>\n`;
		xml += `  <Metadata>\n`;
		xml += `    <MDI key="AREA_OR_POINT">Area</MDI>\n`;
		xml += `  </Metadata>\n`;

		bandStats.forEach(({ band, name, min, max, mean, stddev }) => {
			xml += `  <PAMRasterBand band="${band}">\n`;
			xml += `    <Description>${name}</Description>\n`;
			xml += `    <Metadata>\n`;
			xml += `      <MDI key="STATISTICS_APPROXIMATE">YES</MDI>\n`;
			xml += `      <MDI key="STATISTICS_MAXIMUM">${Math.round(max)}</MDI>\n`;
			xml += `      <MDI key="STATISTICS_MEAN">${mean.toFixed(12)}</MDI>\n`;
			xml += `      <MDI key="STATISTICS_MINIMUM">${Math.round(min)}</MDI>\n`;
			xml += `      <MDI key="STATISTICS_STDDEV">${stddev.toFixed(12)}</MDI>\n`;
			xml += `      <MDI key="STATISTICS_VALID_PERCENT">100</MDI>\n`;
			xml += `    </Metadata>\n`;
			xml += `  </PAMRasterBand>\n`;
		});
	}

	xml += `</PAMDataset>`;
	return xml;
};

// ============================
// 画像統計
// ============================

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
 * Blob画像からRGB各バンドの統計情報を計算
 */
export const calculateBandStatsFromBlob = async (blob: Blob): Promise<BandStats[]> => {
	const bitmap = await createImageBitmap(blob);
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('OffscreenCanvas context取得失敗');

	ctx.drawImage(bitmap, 0, 0);
	const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
	bitmap.close();

	const redStats = calculateImageStatistics(imageData, 0);
	const greenStats = calculateImageStatistics(imageData, 1);
	const blueStats = calculateImageStatistics(imageData, 2);

	return [
		{ band: 1, name: 'Red', ...redStats },
		{ band: 2, name: 'Green', ...greenStats },
		{ band: 3, name: 'Blue', ...blueStats }
	];
};

// WGS84 → Web Mercator (EPSG:3857) 変換
const DEG2RAD = Math.PI / 180;
const R = 6378137;
export const lngToMercX = (lng: number) => R * lng * DEG2RAD;
export const latToMercY = (lat: number) => R * Math.log(Math.tan(Math.PI / 4 + (lat * DEG2RAD) / 2));

/**
 * GeoTransformパラメータを計算（回転対応、メルカトル座標）
 */
/**
 * WGS84 bboxをメルカトルに変換してGeoTransformを計算
 */
const calculateMercatorGeoTransform = (
	wgs84Bounds: [number, number, number, number],
	imageWidth: number,
	imageHeight: number
): number[] => {
	const [west, south, east, north] = wgs84Bounds;
	const mercBbox: [number, number, number, number] = [
		lngToMercX(west),
		latToMercY(south),
		lngToMercX(east),
		latToMercY(north)
	];
	return calculateGeoTransformFromBbox(mercBbox, imageWidth, imageHeight);
};

/**
 * PAMDataset (GDAL Auxiliary File) を生成
 */
export const generateAuxXml = async (
	bounds: [number, number, number, number],
	imageDataUrl: string,
	epsg: number = 3857
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

	const bandStats: BandStats[] = [
		{ band: 1, name: 'Red', ...redStats },
		{ band: 2, name: 'Green', ...greenStats },
		{ band: 3, name: 'Blue', ...blueStats }
	];

	const geoTransform = calculateMercatorGeoTransform(bounds, img.width, img.height);

	return buildAuxXml(geoTransform, epsg, bandStats);
};

/**
 * .aux.xmlファイルをダウンロード
 */
export const downloadAuxXml = async (
	bounds: [number, number, number, number],
	imageDataUrl: string,
	epsg: number = 3857,
	filename: string = 'map.png.aux.xml'
) => {
	const xmlContent = await generateAuxXml(bounds, imageDataUrl, epsg);

	const blob = new Blob([xmlContent], { type: 'application/xml' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};
