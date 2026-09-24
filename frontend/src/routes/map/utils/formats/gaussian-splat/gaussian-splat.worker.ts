import { type GaussianSplatEncoding, parseGaussianSplat } from './index';

interface GaussianSplatWorkerRequest {
	buffer: ArrayBuffer;
	encoding?: GaussianSplatEncoding;
}

interface WorkerScope {
	postMessage: (message: unknown, transfer?: Transferable[]) => void;
}

self.onmessage = async (event: MessageEvent<GaussianSplatWorkerRequest>) => {
	try {
		const data = await parseGaussianSplat(event.data.buffer, event.data.encoding);
		const workerScope = self as unknown as WorkerScope;
		workerScope.postMessage(
			{ data },
			[
				data.positions.buffer as ArrayBuffer,
				data.colors.buffer as ArrayBuffer,
				data.opacities.buffer as ArrayBuffer,
				data.scales.buffer as ArrayBuffer
			]
		);
	} catch (error) {
		(self as unknown as WorkerScope).postMessage({
			error: error instanceof Error ? error.message : String(error)
		});
	}
};
