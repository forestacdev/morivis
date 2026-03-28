/**
 * COG (Cloud Optimized GeoTIFF) タイルマネージャ
 *
 * リモートCOGへの接続を管理し、Webメルカトルタイル座標 (z, x, y) に対応する
 * ラスターデータを geotiff.js の HTTP Range request で効率的に読み取る。
 */
import { fromUrl, type GeoTIFF, type GeoTIFFImage } from 'geotiff';
import proj4 from 'proj4';

export interface CogMetadata {
	/** フル解像度の幅 */
	fullWidth: number;
	/** フル解像度の高さ */
	fullHeight: number;
	/** バンド数 */
	numBands: number;
	/** nodata値 */
	nodata: number | null;
	/** WGS84 bbox [minLon, minLat, maxLon, maxLat] */
	bbox: [number, number, number, number];
	/** オーバービュー情報（index → {width, height}） */
	overviews: { index: number; width: number; height: number }[];
	/** 推奨 minZoom */
	minZoom: number;
	/** 推奨 maxZoom */
	maxZoom: number;
	/** バンドごとのサンプルmin/max（サムネイル用小サンプルから） */
	sampleRanges: { min: number; max: number }[];
}

interface CogConnection {
	tiff: GeoTIFF;
	images: GeoTIFFImage[]; // index 0 = full, 1+ = overviews
	metadata: CogMetadata;
	/** COGネイティブ座標系のbbox（ピクセルウィンドウ計算用） */
	nativeBbox: [number, number, number, number];
	/** COGのproj4定義名（EPSG:XXXX）。EPSG:4326の場合はnull */
	projName: string | null;
}

const connections = new Map<string, CogConnection>();

// --- タイル座標 ↔ 経緯度変換 ---

const tileToLon = (x: number, z: number): number => (x / Math.pow(2, z)) * 360 - 180;

const tileToLat = (y: number, z: number): number => {
	const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
	return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/** ズームレベルでのピクセルあたりの度数（赤道上） */
const degreesPerPixel = (z: number, tileSize: number): number =>
	360 / (Math.pow(2, z) * tileSize);

/** COGのピクセルあたりの度数 */
const cogDegreesPerPixel = (bbox: [number, number, number, number], width: number): number =>
	(bbox[2] - bbox[0]) / width;

/** ズームレベルに最適なオーバービューを選択 */
const selectOverviewForZoom = (
	conn: CogConnection,
	z: number,
	tileSize: number
): GeoTIFFImage => {
	const targetDpp = degreesPerPixel(z, tileSize);
	const { overviews, bbox, fullWidth } = conn.metadata;

	// フル解像度のdpp
	const fullDpp = cogDegreesPerPixel(bbox, fullWidth);

	// ターゲットdppに最も近い（ターゲット以下の）解像度を選ぶ
	// 解像度が高すぎるとデータ転送量が無駄に大きくなる
	let bestIndex = 0; // デフォルトはフル解像度
	let bestDpp = fullDpp;

	for (const ovr of overviews) {
		const ovrDpp = cogDegreesPerPixel(bbox, ovr.width);
		// オーバービューのdppがターゲットより小さい（= より高解像度）場合は候補
		// ターゲットに最も近い（最も低解像度だが十分な）オーバービューを選ぶ
		if (ovrDpp <= targetDpp && ovrDpp > bestDpp) {
			bestIndex = ovr.index;
			bestDpp = ovrDpp;
		}
	}

	// どのオーバービューもターゲットより高解像度すぎる場合は最も低解像度のものを選ぶ
	if (bestIndex === 0 && fullDpp < targetDpp && overviews.length > 0) {
		const lowestRes = overviews[overviews.length - 1];
		bestIndex = lowestRes.index;
	}

	return conn.images[bestIndex];
};

// --- getMinMax ユーティリティ ---

const getMinMax = (
	data: ArrayLike<number>,
	nodata: number | null
): { min: number; max: number } => {
	let min = Infinity;
	let max = -Infinity;
	for (let i = 0; i < data.length; i++) {
		const v = data[i];
		if (nodata !== null && v === nodata) continue;
		if (!isFinite(v)) continue;
		if (v < min) min = v;
		if (v > max) max = v;
	}
	if (!isFinite(min)) {
		min = 0;
		max = 1;
	}
	return { min, max };
};

// --- CRS検出 & bbox変換 ---

/** GeoKeysからEPSGコードを取得 */
const getEpsgFromGeoKeys = (image: GeoTIFFImage): number | null => {
	const geoKeys = image.getGeoKeys();
	if (!geoKeys) return null;
	// ProjectedCSTypeGeoKey (投影座標系) が優先
	if (geoKeys.ProjectedCSTypeGeoKey && geoKeys.ProjectedCSTypeGeoKey !== 32767) {
		return geoKeys.ProjectedCSTypeGeoKey;
	}
	// GeographicTypeGeoKey (地理座標系)
	if (geoKeys.GeographicTypeGeoKey && geoKeys.GeographicTypeGeoKey !== 32767) {
		return geoKeys.GeographicTypeGeoKey;
	}
	return null;
};

/** epsg.ioからproj4定義を取得してproj4に登録 */
const registerEpsg = async (epsgCode: number): Promise<string | null> => {
	const defName = `EPSG:${epsgCode}`;
	// 既に登録済みか確認
	try {
		proj4(defName);
		return defName;
	} catch {
		// 未登録
	}
	try {
		const res = await fetch(`https://epsg.io/${epsgCode}.proj4`);
		if (!res.ok) return null;
		const proj4String = (await res.text()).trim();
		if (!proj4String || !proj4String.startsWith('+')) return null;
		proj4.defs(defName, proj4String);
		return defName;
	} catch {
		return null;
	}
};

/** bboxをWGS84に変換 */
const transformBboxToWgs84 = (
	rawBbox: number[],
	projName: string
): [number, number, number, number] => {
	const [llX, llY] = proj4(projName, 'EPSG:4326', [rawBbox[0], rawBbox[1]]);
	const [urX, urY] = proj4(projName, 'EPSG:4326', [rawBbox[2], rawBbox[3]]);
	return [llX, llY, urX, urY];
};

// --- 公開API ---

export const CogTileManager = {
	/**
	 * COGを開いてメタデータを読み取り、接続を登録する
	 */
	register: async (entryId: string, url: string): Promise<CogMetadata> => {
		// 既に登録済みならメタデータを返す
		const existing = connections.get(entryId);
		if (existing) return existing.metadata;

		const tiff = await fromUrl(url);
		const fullImage = await tiff.getImage();
		const fullWidth = fullImage.getWidth();
		const fullHeight = fullImage.getHeight();
		const numBands = fullImage.getSamplesPerPixel();

		// nodata
		const gdalNodata = fullImage.getGDALNoData();
		const nodata = gdalNodata !== null ? gdalNodata : null;

		// bbox（CRS検出 → WGS84に変換）
		const rawBbox = fullImage.getBoundingBox();
		let bbox: [number, number, number, number] = [
			rawBbox[0],
			rawBbox[1],
			rawBbox[2],
			rawBbox[3]
		];

		const nativeBbox: [number, number, number, number] = [...bbox];
		let resolvedProjName: string | null = null;

		const epsgCode = getEpsgFromGeoKeys(fullImage);
		if (epsgCode && epsgCode !== 4326) {
			resolvedProjName = await registerEpsg(epsgCode);
			if (resolvedProjName) {
				bbox = transformBboxToWgs84(rawBbox, resolvedProjName);
			}
		}

		// オーバービュー情報を収集
		const imageCount = await tiff.getImageCount();
		const images: GeoTIFFImage[] = [fullImage];
		const overviews: CogMetadata['overviews'] = [];

		for (let i = 1; i < imageCount; i++) {
			try {
				const ovr = await tiff.getImage(i);
				const ovrW = ovr.getWidth();
				const ovrH = ovr.getHeight();
				// オーバービューはフル解像度より小さいはず
				if (ovrW < fullWidth && ovrH < fullHeight) {
					images.push(ovr);
					overviews.push({ index: i, width: ovrW, height: ovrH });
				}
			} catch {
				break;
			}
		}

		// ズームレベル計算
		const fullDpp = cogDegreesPerPixel(bbox, fullWidth);
		const maxZoom = Math.min(
			22,
			Math.ceil(Math.log2(360 / (fullDpp * 256)))
		);
		const lowestOvr = overviews[overviews.length - 1];
		const lowestDpp = lowestOvr
			? cogDegreesPerPixel(bbox, lowestOvr.width)
			: fullDpp;
		const minZoom = Math.max(
			0,
			Math.floor(Math.log2(360 / (lowestDpp * 256)))
		);

		// サンプルmin/max（最小オーバービューまたはフル解像度が小さければそれ自体から）
		const sampleImage = lowestOvr ? images[images.length - 1] : fullImage;
		const sampleRasters = await sampleImage.readRasters();
		const sampleRanges: CogMetadata['sampleRanges'] = [];
		for (let i = 0; i < numBands; i++) {
			const band = sampleRasters[i] as Float32Array | Uint8Array | Uint16Array;
			sampleRanges.push(getMinMax(band, nodata));
		}

		const metadata: CogMetadata = {
			fullWidth,
			fullHeight,
			numBands,
			nodata,
			bbox,
			overviews,
			minZoom,
			maxZoom,
			sampleRanges
		};

		connections.set(entryId, { tiff, images, metadata, nativeBbox, projName: resolvedProjName });
		return metadata;
	},

	/**
	 * タイル座標に対応するラスターデータを読み取る
	 * @returns バンドごとのTypedArray配列、またはタイルがCOG範囲外ならnull
	 */
	readTile: async (
		entryId: string,
		z: number,
		x: number,
		y: number,
		tileSize = 256
	): Promise<{
		bands: (Float32Array | Uint8Array | Uint16Array)[];
		width: number;
		height: number;
	} | null> => {
		const conn = connections.get(entryId);
		if (!conn) return null;

		const { bbox } = conn.metadata;
		const { nativeBbox, projName } = conn;

		// タイルの経緯度範囲
		const tileLonMin = tileToLon(x, z);
		const tileLonMax = tileToLon(x + 1, z);
		const tileLatMax = tileToLat(y, z);
		const tileLatMin = tileToLat(y + 1, z);

		// COGのWGS84 bboxと交差しない場合はnull
		if (
			tileLonMax <= bbox[0] ||
			tileLonMin >= bbox[2] ||
			tileLatMax <= bbox[1] ||
			tileLatMin >= bbox[3]
		) {
			return null;
		}

		// ズームレベルに最適なオーバービューを選択
		const image = selectOverviewForZoom(conn, z, tileSize);
		const imgWidth = image.getWidth();
		const imgHeight = image.getHeight();

		// ピクセルウィンドウはCOGのネイティブ座標系で計算する
		let tileXMin: number, tileYMin: number, tileXMax: number, tileYMax: number;

		if (projName) {
			// 経緯度 → COGのネイティブ座標系に逆変換
			const [nMinX, nMinY] = proj4('EPSG:4326', projName, [tileLonMin, tileLatMin]);
			const [nMaxX, nMaxY] = proj4('EPSG:4326', projName, [tileLonMax, tileLatMax]);
			tileXMin = nMinX;
			tileYMin = nMinY;
			tileXMax = nMaxX;
			tileYMax = nMaxY;
		} else {
			// EPSG:4326 — そのまま経緯度
			tileXMin = tileLonMin;
			tileYMin = tileLatMin;
			tileXMax = tileLonMax;
			tileYMax = tileLatMax;
		}

		// ネイティブbboxでのピクセル座標に変換
		const cogXRange = nativeBbox[2] - nativeBbox[0];
		const cogYRange = nativeBbox[3] - nativeBbox[1];

		// ピクセル座標（COGは左上原点、Y軸下向き）
		const pxLeft = Math.floor(((tileXMin - nativeBbox[0]) / cogXRange) * imgWidth);
		const pxRight = Math.ceil(((tileXMax - nativeBbox[0]) / cogXRange) * imgWidth);
		const pxTop = Math.floor(((nativeBbox[3] - tileYMax) / cogYRange) * imgHeight);
		const pxBottom = Math.ceil(((nativeBbox[3] - tileYMin) / cogYRange) * imgHeight);

		// COG画像範囲にクリップ
		const winLeft = Math.max(0, pxLeft);
		const winTop = Math.max(0, pxTop);
		const winRight = Math.min(imgWidth, pxRight);
		const winBottom = Math.min(imgHeight, pxBottom);

		const winWidth = winRight - winLeft;
		const winHeight = winBottom - winTop;

		if (winWidth <= 0 || winHeight <= 0) return null;

		// readRastersでタイルサイズにリサンプリング
		const rasters = await image.readRasters({
			window: [winLeft, winTop, winRight, winBottom],
			width: tileSize,
			height: tileSize
		});

		const bands: (Float32Array | Uint8Array | Uint16Array)[] = [];
		for (let i = 0; i < rasters.length; i++) {
			bands.push(rasters[i] as Float32Array | Uint8Array | Uint16Array);
		}

		return { bands, width: tileSize, height: tileSize };
	},

	/** メタデータを取得 */
	getMetadata: (entryId: string): CogMetadata | null => {
		return connections.get(entryId)?.metadata ?? null;
	},

	/** 接続を解除 */
	unregister: (entryId: string): void => {
		connections.delete(entryId);
	},

	/** 登録済みか確認 */
	has: (entryId: string): boolean => connections.has(entryId)
};
