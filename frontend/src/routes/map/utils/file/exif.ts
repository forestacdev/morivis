/**
 * EXIF GPS情報付き写真のパーサー
 *
 * JPEG/HEICファイルからEXIF GPS座標・撮影日時・方位を抽出し、
 * GeoJSON FeatureCollectionに変換する。
 */
import * as exifr from 'exifr';

export interface GeoPhotoFeature {
	type: 'Feature';
	geometry: {
		type: 'Point';
		coordinates: [number, number];
	};
	properties: {
		fileName: string;
		imageUrl: string;
		datetime: string | null;
		bearing: number | null;
		altitude: number | null;
	};
}

export interface GeoPhotoResult {
	features: GeoPhotoFeature[];
	skippedCount: number;
}

/** 単一ファイルからEXIF GPS情報を抽出 */
const parseExifGps = async (
	file: File
): Promise<{
	lat: number;
	lng: number;
	datetime?: string;
	bearing?: number;
	altitude?: number;
} | null> => {
	try {
		// GPS座標を取得
		const gps = await exifr.gps(file);
		if (!gps?.latitude || !gps?.longitude) return null;

		// 追加メタデータを取得
		let datetime: string | undefined;
		let bearing: number | undefined;
		let altitude: number | undefined;

		try {
			const meta = await exifr.parse(file, ['DateTimeOriginal', 'GPSImgDirection', 'GPSAltitude']);
			if (meta) {
				datetime = meta.DateTimeOriginal
					? meta.DateTimeOriginal instanceof Date
						? meta.DateTimeOriginal.toISOString()
						: String(meta.DateTimeOriginal)
					: undefined;
				bearing = meta.GPSImgDirection ?? undefined;
				altitude = meta.GPSAltitude ?? undefined;
			}
		} catch {
			// メタデータ取得失敗はGPS情報があればOK
		}

		return {
			lat: gps.latitude,
			lng: gps.longitude,
			datetime,
			bearing,
			altitude
		};
	} catch {
		return null;
	}
};

/** 単一ファイルにEXIF GPS情報があるかを高速チェック */
export const hasExifGps = async (file: File): Promise<boolean> => {
	try {
		const gps = await exifr.gps(file);
		return gps?.latitude != null && gps?.longitude != null;
	} catch {
		return false;
	}
};

/** 複数ファイルからGPS付き写真をGeoJSON FeatureCollectionに変換 */
export const parseGeoPhotos = async (files: File[]): Promise<GeoPhotoResult> => {
	const features: GeoPhotoFeature[] = [];
	let skippedCount = 0;

	for (const file of files) {
		const gps = await parseExifGps(file);
		if (!gps) {
			skippedCount++;
			continue;
		}

		const imageUrl = URL.createObjectURL(file);

		features.push({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [gps.lng, gps.lat]
			},
			properties: {
				fileName: file.name,
				imageUrl,
				datetime: gps.datetime ?? null,
				bearing: gps.bearing ?? null,
				altitude: gps.altitude ?? null
			}
		});
	}

	return { features, skippedCount };
};
