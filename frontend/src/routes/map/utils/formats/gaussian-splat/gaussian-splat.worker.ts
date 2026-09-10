import { parseGaussianSplatPly } from './index';

interface GaussianSplatWorkerRequest {
	buffer: ArrayBuffer;
}

interface WorkerScope {
	postMessage: (message: unknown, transfer?: Transferable[]) => void;
}

self.onmessage = (event: MessageEvent<GaussianSplatWorkerRequest>) => {
	try {
		const data = parseGaussianSplatPly(event.data.buffer);
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
