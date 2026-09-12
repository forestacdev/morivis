import { inspectLocalTileFolder, parseLocalTilePath } from '../local-tiles';

const EXTENSION = /\.(png|jpe?g|webp)$/i;
export const isRasterTileFile = (file: File) => EXTENSION.test(file.name);
export const parseRasterTilePath = (file: File) => parseLocalTilePath(file, EXTENSION);

/** 通常の写真やモデルのテクスチャ一式をタイルとして扱わない。 */
export const isLocalRasterTileFolder = (files: File[]) =>
	files.some(file => parseRasterTilePath(file))
	&& files.every(file =>
		isRasterTileFile(file) || /^tilejson\.json$/i.test(file.name) || file.name.startsWith('.')
	);

export const isLocalRasterTileInput = async (files: File[]) => {
	if (isLocalRasterTileFolder(files)) return true;
	if (files.length === 1 && /^tilejson\.json$/i.test(files[0].name)) {
		try {
			const metadata = JSON.parse(await files[0].text());
			return Array.isArray(metadata?.tiles)
				&& metadata.tiles.some((url: unknown) =>
					typeof url === 'string' && /\.(png|jpe?g|webp)(?:\?|$)/i.test(url)
				);
		} catch {
			return false;
		}
	}
	return false;
};

export const inspectLocalRasterTiles = async (files: File[], scheme?: 'xyz' | 'tms') => {
	const folder = await inspectLocalTileFolder(files, {
		isTileFile: isRasterTileFile,
		extension: EXTENSION,
		label: 'ラスタータイル',
		scheme
	});
	// タイルサイズの確認で画像を1枚だけ開く。地図表示用の画像は保持しない。
	const sample = folder.tiles.values().next().value!;
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(sample);
	} catch {
		throw new Error(
			'タイル画像を読み取れませんでした。PNG・JPEG・WebPの画像を確認してください。'
		);
	}
	try {
		if (bitmap.width !== bitmap.height || (bitmap.width !== 256 && bitmap.width !== 512)) {
			throw new Error('タイル画像は256×256または512×512ピクセルに対応しています。');
		}
		return { ...folder, tileSize: bitmap.width as 256 | 512 };
	} finally {
		bitmap.close();
	}
};

export type LocalRasterTileSource = Awaited<ReturnType<typeof inspectLocalRasterTiles>>;
