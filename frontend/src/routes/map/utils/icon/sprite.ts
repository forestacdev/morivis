import { MAP_SPRITE_DATA_PATH } from '$routes/constants';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';

export interface SpriteIcon {
	id: string;
	src: string;
}

interface SpriteRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

let spriteIconsPromise: Promise<SpriteIcon[]> | null = null;

// 地図と同じスプライトを使い、地図側の画像読み込み状況に依存せず候補を表示する。
export const loadSpriteIcons = (): Promise<SpriteIcon[]> => {
	if (spriteIconsPromise) return spriteIconsPromise;

	spriteIconsPromise = (async () => {
		const [metadataResponse, imageResponse] = await Promise.all(
			['json', 'png'].map((extension) =>
				fetchWithDevProxy(`${MAP_SPRITE_DATA_PATH}.${extension}`, {
					signal: AbortSignal.timeout(15000)
				})
			)
		);
		if (!metadataResponse.ok || !imageResponse.ok) {
			throw new Error('スプライトを取得できませんでした');
		}
		const metadata: Record<string, SpriteRegion> = await metadataResponse.json();
		const image = await createImageBitmap(await imageResponse.blob());
		try {
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			if (!context) throw new Error('アイコン画像を生成できませんでした');

			return Object.entries(metadata).map(([id, { x, y, width, height }]) => {
				if (
					![x, y, width, height].every(Number.isInteger)
					|| x < 0 || y < 0 || width <= 0 || height <= 0
					|| x + width > image.width || y + height > image.height
				) {
					throw new Error('スプライトの画像範囲が不正です');
				}
				canvas.width = width;
				canvas.height = height;
				context.drawImage(image, x, y, width, height, 0, 0, width, height);
				return { id, src: canvas.toDataURL('image/png') };
			});
		} finally {
			image.close();
		}
	})().catch((error) => {
		spriteIconsPromise = null;
		throw error;
	});

	return spriteIconsPromise;
};
