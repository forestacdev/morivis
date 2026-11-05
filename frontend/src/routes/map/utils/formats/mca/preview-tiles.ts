import type { McaTileResponse } from './surface-tile.worker';

/** 1リージョンずつ生成し、表示範囲の変更や3D変換開始時には処理中の展開も停止する。 */
export const loadMcaPreviewTiles = (
	files: File[],
	onTile: (file: File, result: McaTileResponse) => void
) => {
	if (!files.length) return;
	let index = 0;
	const worker = new Worker(new URL('./surface-tile.worker.ts', import.meta.url), {
		type: 'module'
	});
	worker.onmessage = ({ data }: MessageEvent<McaTileResponse>) => {
		onTile(files[index++], data);
		if (index < files.length) worker.postMessage(files[index]);
		else worker.terminate();
	};
	worker.onerror = () => {
		worker.terminate();
		for (const file of files.slice(index)) onTile(file, { error: '地形画像を生成できません' });
	};
	worker.postMessage(files[index]);
	return () => worker.terminate();
};
