import { parseS57, type S57Result } from '.';
import { getS57Datasets, type S57DatasetFiles } from './files';

export type S57Response = { result: S57Result; } | { error: string; };
self.onmessage = async ({ data }: MessageEvent<{ dataset: S57DatasetFiles; }>) => {
	try {
		const [dataset] = getS57Datasets([data.dataset.base, ...data.dataset.updates]);
		const base = new Uint8Array(await dataset.base.arrayBuffer());
		const updates = await Promise.all(
			dataset.updates.map(async file => ({
				name: file.name,
				bytes: new Uint8Array(await file.arrayBuffer())
			}))
		);
		const result = parseS57(base, updates);
		if (
			updates.length && result.metadata.name.replace(/\.\d{3}$/, '').toLowerCase()
				!== dataset.base.name.replace(/\.000$/i, '').toLowerCase()
		) {
			throw new Error('S-57のファイル名と基本セル内のデータ名が一致しません');
		}
		postMessage({ result } satisfies S57Response);
	} catch (error) {
		postMessage(
			{ error: error instanceof Error ? error.message : String(error) } satisfies S57Response
		);
	}
};
