import { MAX_REGION_BYTES, readMcaRegion } from './region';
import { MCA_TILE_SIZE, renderMcaSurfaceTile } from './surface-tile';
import { parseMcaRegionFileName } from './world-placement';

export type McaTileResponse = { image: Blob; } | { error: string; };

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
	try {
		if (file.size > MAX_REGION_BYTES) throw new Error('MCAファイルは256 MiB以下にしてください');
		const region = parseMcaRegionFileName(file.name);
		if (!region) throw new Error('リージョン名が不正です');
		const parsed = await readMcaRegion(await file.arrayBuffer(), { region });
		const canvas = new OffscreenCanvas(MCA_TILE_SIZE, MCA_TILE_SIZE);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('地形画像を生成できません');
		context.putImageData(new ImageData(renderMcaSurfaceTile(parsed), MCA_TILE_SIZE), 0, 0);
		const image = await canvas.convertToBlob({ type: 'image/png' });
		postMessage({ image } satisfies McaTileResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : '地形画像を生成できません'
			} satisfies McaTileResponse
		);
	}
};
