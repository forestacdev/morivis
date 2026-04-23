import type { FeatureCollection } from '$routes/map/types/geojson';
import * as shapefile from 'shapefile';
import { isWgs84Prj, transformGeoJSONParallel } from '$routes/map/utils/proj';
import { showNotification } from '$routes/stores/notification';

const loadBinaryFile = (file: File): Promise<ArrayBuffer> => {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result;
			if (result == null) {
				return;
			}
			resolve(result as ArrayBuffer);
		};
		reader.readAsArrayBuffer(file);
	});
};

/**
 * .cpgファイルからエンコーディング名を読み取る
 */
export const readCpgEncoding = async (cpgFile: File): Promise<string> => {
	const text = (await cpgFile.text()).trim();
	// よくあるエイリアスを正規化
	const lower = text.toLowerCase();
	if (lower === 'utf-8' || lower === 'utf8') return 'utf-8';
	if (lower.startsWith('shift') || lower === 'cp932' || lower === '932') return 'shift-jis';
	if (lower === 'euc-jp' || lower === 'eucjp') return 'euc-jp';
	if (lower.startsWith('iso-8859') || lower.startsWith('latin')) return text;
	// そのまま返す（shapefile.jsが対応するエンコーディング名）
	return text;
};

export const shpFileToGeojson = async (
	shp: File,
	dbf?: File,
	prjContent?: string,
	encoding?: string
): Promise<FeatureCollection> => {
	const [shpData, dbfData] =
		shp && dbf
			? await Promise.all([loadBinaryFile(shp), loadBinaryFile(dbf)])
			: await Promise.all([loadBinaryFile(shp), null]);
	if (!shpData) {
		throw new Error('Failed to load .shp file');
	}

	if (!dbfData) {
		throw new Error('Failed to load .dbf file');
	}

	const dbfEncoding = encoding ?? 'shift-jis';

	const geojson =
		prjContent && dbf
			? await shapefile.read(shpData, dbfData, {
					encoding: dbfEncoding
				})
			: await shapefile.read(shpData);
	if (!geojson) {
		throw new Error('Failed to convert SHP to GeoJSON');
	}

	if (!prjContent || !dbf || isWgs84Prj(prjContent)) {
		return geojson as FeatureCollection;
	}

	const geojsonWGS84 = await transformGeoJSONParallel(geojson, prjContent);

	if (!geojsonWGS84) {
		throw new Error('Failed to convert SHP to GeoJSON');
	}

	if (!geojsonWGS84) {
		showNotification('座標系の変換に失敗しました。', 'error');
		return geojson as FeatureCollection;
	}

	return geojsonWGS84 as FeatureCollection;
};
