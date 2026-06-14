/**
 * References:
 * - https://exiftool.org/TagNames/GPS.html
 * - https://github.com/MikeKovarik/exifr
 * - https://github.com/hoppergee/heic-to
 */
import * as exifr from 'exifr';
import { heicTo, isHeic } from 'heic-to';

export interface GeoPhotoFeature {
	type: 'Feature';
	geometry: {
		type: 'Point';
		coordinates: [number, number];
	};
	properties: {
		fileName: string;
		imageUrl: string;
		iconImageUrl: string;
		coverImageUrl: string;
		datetime: string | null;
		bearing: number | null;
		altitude: number | null;
	};
}

export interface GeoPhotoResult {
	features: GeoPhotoFeature[];
	skippedCount: number;
}

const createDisplayImageUrl = async (file: File): Promise<string> => {
	const originalUrl = URL.createObjectURL(file);
	const isHeicFile = await isHeic(file);

	if (!isHeicFile) {
		return originalUrl;
	}

	try {
		const pngBlob = await heicTo({
			blob: file,
			type: 'image/png',
			quality: 0.92
		});

		URL.revokeObjectURL(originalUrl);
		return URL.createObjectURL(pngBlob);
	} catch {
		return originalUrl;
	}
};

const createSquareThumbnailImageUrl = async (
	imageUrl: string,
	size: number = 192
): Promise<string> => {
	try {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
			img.src = imageUrl;
		});

		const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
		const sourceX = (image.naturalWidth - sourceSize) / 2;
		const sourceY = (image.naturalHeight - sourceSize) / 2;

		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas context取得失敗');

		ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(nextBlob) =>
					nextBlob
						? resolve(nextBlob)
						: reject(new Error('アイコン画像の生成に失敗しました')),
				'image/webp',
				0.9
			);
		});

		return URL.createObjectURL(blob);
	} catch {
		return imageUrl;
	}
};

/** 単一ファイルからEXIF GPS情報を抽出 */
const parseExifGps = async (
	file: File
): Promise<
	{
		lat: number;
		lng: number;
		datetime?: string;
		bearing?: number;
		altitude?: number;
	} | null
> => {
	try {
		// GPS座標を取得
		const gps = await exifr.gps(file);
		if (!gps?.latitude || !gps?.longitude) return null;

		// 追加メタデータを取得
		let datetime: string | undefined;
		let bearing: number | undefined;
		let altitude: number | undefined;

		try {
			const meta = await exifr.parse(file, [
				'DateTimeOriginal',
				'GPSImgDirection',
				'GPSAltitude'
			]);
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

		const imageUrl = await createDisplayImageUrl(file);
		const iconImageUrl = await createSquareThumbnailImageUrl(imageUrl, 192);
		const coverImageUrl = await createSquareThumbnailImageUrl(imageUrl, 512);

		features.push({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [gps.lng, gps.lat]
			},
			properties: {
				fileName: file.name,
				imageUrl,
				iconImageUrl,
				coverImageUrl,
				datetime: gps.datetime ?? null,
				bearing: gps.bearing ?? null,
				altitude: gps.altitude ?? null
			}
		});
	}

	return { features, skippedCount };
};
