import { fromArrayBuffer } from '$routes/map/utils/formats/geotiff/reader';
import { getProjContext, isValidEpsg } from '$routes/map/utils/proj/dict';
import { DOMParser } from '@xmldom/xmldom';
import type { GeoTransform } from '../envi-bil';
import { MAX_METADATA_BYTES } from './boxes';
export interface Jp2Spatial {
	transform: GeoTransform | null;
	crs: string;
	nodata: number | null;
}
export const crsFromEpsg = (code: number): string => {
	const value = String(code);
	if (isValidEpsg(value)) return getProjContext(value);
	if (code >= 32601 && code <= 32660) {
		return `+proj=utm +zone=${code - 32600} +datum=WGS84 +units=m +no_defs`;
	}
	if (code >= 32701 && code <= 32760) {
		return `+proj=utm +zone=${code - 32700} +south +datum=WGS84 +units=m +no_defs`;
	}
	return '';
};
export const readGeoJp2 = async (buffer?: ArrayBuffer): Promise<Jp2Spatial> => {
	if (!buffer) return { transform: null, crs: '', nodata: null };
	const tiff = await fromArrayBuffer(buffer), image = await tiff.getImage();
	const dir = image.getFileDirectory(), keys = image.getGeoKeys();
	const m = dir.ModelTransformation, tie = dir.ModelTiepoint, scale = dir.ModelPixelScale;
	let transform: GeoTransform | null = null;
	if (m?.length === 16) transform = [m[3], m[0], m[1], m[7], m[4], m[5]];
	else if (tie?.length >= 6 && scale?.length >= 2) {
		transform = [
			tie[3] - tie[0] * scale[0],
			scale[0],
			0,
			tie[4] + tie[1] * scale[1],
			0,
			-scale[1]
		];
	}
	if (transform && keys?.GTRasterTypeGeoKey === 2) {
		transform[0] -= (transform[1] + transform[2]) / 2;
		transform[3] -= (transform[4] + transform[5]) / 2;
	}
	// User-definedな投影を、下位の地理座標系コードへ取り違えない。
	const projected = keys?.GTModelTypeGeoKey === 1 || keys?.ProjectedCSTypeGeoKey !== undefined;
	const code = projected ? keys?.ProjectedCSTypeGeoKey : keys?.GeographicTypeGeoKey;
	const nodata = dir.GDAL_NODATA === undefined
		? null
		: Number(String(dir.GDAL_NODATA).replaceAll('\0', ''));
	return { transform, crs: code === undefined ? '' : crsFromEpsg(Number(code)), nodata };
};
export const readJp2Sidecars = async (
	spatial: Jp2Spatial,
	files: { world?: File; prj?: File; aux?: File; }
) => {
	const result = { ...spatial };
	for (const file of [files.world, files.prj, files.aux]) {
		if (file && file.size > MAX_METADATA_BYTES) {
			throw new Error('JP2の付属ファイルは各1 MiB以下にしてください');
		}
	}
	if (!result.transform && files.world) {
		const values = (await files.world.text()).trim().split(/\s+/).map(Number);
		if (values.length !== 6 || !values.every(Number.isFinite)) {
			throw new Error('ワールドファイルが不正です');
		}
		const [a, d, b, e, x, y] = values;
		result.transform = [x - (a + b) / 2, a, b, y - (d + e) / 2, d, e];
	}
	if (files.aux) {
		const xml = await files.aux.text();
		if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
			throw new Error('AUX.XMLの外部定義には対応していません');
		}
		const doc = new DOMParser().parseFromString(xml, 'text/xml');
		if (doc.documentElement?.nodeName !== 'PAMDataset') throw new Error('AUX.XMLが不正です');
		const srs = doc.getElementsByTagName('SRS')[0]?.textContent?.trim();
		const gt = doc.getElementsByTagName('GeoTransform')[0]?.textContent;
		if (srs) result.crs = srs;
		if (gt) {
			const values = gt.trim().split(',').map(Number);
			if (values.length !== 6 || !values.every(Number.isFinite)) {
				throw new Error('AUX.XMLの画像位置が不正です');
			}
			result.transform = values as GeoTransform;
		}
		const nodata = doc.getElementsByTagName('NoDataValue')[0]?.textContent;
		if (nodata?.trim()) result.nodata = Number(nodata);
	}
	if (files.prj) result.crs = (await files.prj.text()).trim() || result.crs;
	return result;
};
