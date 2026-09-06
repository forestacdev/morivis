/**
 * References:
 * - https://exiftool.org/TagNames/GPS.html
 * - https://github.com/MikeKovarik/exifr
 * - https://github.com/hoppergee/heic-to
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
		locationSource: 'exif' | 'device';
		imageUrl: string;
		iconImageUrl: string;
		coverImageUrl: string;
		datetime: string | null;
		bearing: number | null;
		altitude: number | null;
	};
}

export interface PhotoLocation {
	lat: number;
	lng: number;
}

interface GeoPhotoOptions {
	resolveMissingLocation?: (count: number) => Promise<PhotoLocation | null>;
	signal?: AbortSignal;
}

const isValidGps = (gps: { latitude?: number; longitude?: number; } | undefined): boolean =>
	typeof gps?.latitude === 'number' && Number.isFinite(gps.latitude)
	&& Math.abs(gps.latitude) <= 90
	&& typeof gps.longitude === 'number' && Number.isFinite(gps.longitude)
	&& Math.abs(gps.longitude) <= 180;

export interface GeoPhotoResult {
	features: GeoPhotoFeature[];
	skippedCount: number;
}

const createDisplayImageUrl = async (file: File): Promise<string> => {
	const originalUrl = URL.createObjectURL(file);

	try {
		// 形式判定に変換ライブラリを使うと、JPEGでもデコーダー全体を読み込んでしまう。
		const header = new TextDecoder().decode(await file.slice(0, 12).arrayBuffer());
		const brand = header.slice(8, 12);
		if (
			header.slice(4, 8) !== 'ftyp'
			|| !['mif1', 'msf1', 'heic', 'heix', 'hevc', 'hevx'].includes(brand)
		) {
			return originalUrl;
		}

		const { heicTo } = await import('heic-to');
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
		if (!isValidGps(gps)) return null;

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
		return isValidGps(gps);
	} catch {
		return false;
	}
};

/** GPSを優先し、位置情報のない写真だけ呼び出し元が承認した座標で補う。 */
export const parseGeoPhotos = async (
	files: File[],
	{ resolveMissingLocation, signal }: GeoPhotoOptions = {}
): Promise<GeoPhotoResult> => {
	const features: GeoPhotoFeature[] = [];
	const urls = new Set<string>();
	let skippedCount = 0;

	try {
		signal?.throwIfAborted();
		const photos = await Promise.all(
			files.map(async (file) => ({ file, gps: await parseExifGps(file) }))
		);
		signal?.throwIfAborted();
		const missingCount = photos.filter(({ gps }) => !gps).length;
		// 画像変換より先に確認する。辞退・位置取得失敗時に不要なデコーダーをロードしない。
		const fallback = missingCount > 0 ? await resolveMissingLocation?.(missingCount) : null;
		signal?.throwIfAborted();

		for (const { file, gps } of photos) {
			signal?.throwIfAborted();
			const location = gps ?? fallback;
			if (!location) {
				skippedCount++;
				continue;
			}

			const imageUrl = await createDisplayImageUrl(file);
			urls.add(imageUrl);
			const iconImageUrl = await createSquareThumbnailImageUrl(imageUrl, 192);
			urls.add(iconImageUrl);
			const coverImageUrl = await createSquareThumbnailImageUrl(imageUrl, 512);
			urls.add(coverImageUrl);
			signal?.throwIfAborted();

			features.push({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [location.lng, location.lat]
				},
				properties: {
					fileName: file.name,
					locationSource: gps ? 'exif' : 'device',
					imageUrl,
					iconImageUrl,
					coverImageUrl,
					datetime: gps?.datetime ?? null,
					bearing: gps?.bearing ?? null,
					altitude: gps?.altitude ?? null
				}
			});
		}

		return { features, skippedCount };
	} catch (error) {
		for (const url of urls) URL.revokeObjectURL(url);
		throw error;
	}
};
