import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import {
	type CabinetRuntimeFactory,
	extractRikCabinet,
	inspectRikCabinet,
	type RikArchiveFile
} from './cabinet';

export type RikWorkerResponse = { files: RikArchiveFile[]; } | { error: string; };

self.onmessage = async (event: MessageEvent<{ arrayBuffer: ArrayBuffer; }>) => {
	try {
		inspectRikCabinet(event.data.arrayBuffer);
		const moduleUrl = resolveStaticAssetPath('/vendor/7z-wasm/7zz.es6.js');
		const { default: createRuntime } = await import(/* @vite-ignore */ moduleUrl) as {
			default: CabinetRuntimeFactory;
		};
		const runtime = await createRuntime({
			locateFile: (path) => resolveStaticAssetPath(`/vendor/7z-wasm/${path}`),
			print: () => {},
			printErr: () => {}
		});
		const files = extractRikCabinet(event.data.arrayBuffer, runtime);
		postMessage({ files } satisfies RikWorkerResponse, {
			transfer: files.map(({ data }) => data.buffer)
		});
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : 'RIKファイルを読み込めませんでした'
			} satisfies RikWorkerResponse
		);
	}
};
