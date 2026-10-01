import { convertOsmPbf } from '.';

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
	try {
		postMessage({ result: await convertOsmPbf(file) });
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : 'OSM PBFの読み込みに失敗しました'
		});
	}
};
