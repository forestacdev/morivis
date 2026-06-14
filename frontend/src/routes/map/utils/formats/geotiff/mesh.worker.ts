import type { CreateRasterMeshEntryParams, RasterMeshGeometry } from './mesh';
import { buildRasterMeshGeometry } from './mesh';

const workerScope = self as typeof self & {
	postMessage: (message: unknown, transfer: Transferable[]) => void;
};

type MeshWorkerRequest = Omit<CreateRasterMeshEntryParams, 'id' | 'name' | 'mapImage'>;

interface MeshWorkerSuccessResponse {
	result: RasterMeshGeometry;
}

interface MeshWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<MeshWorkerRequest>) => {
	try {
		const result = await buildRasterMeshGeometry(event.data);
		workerScope.postMessage({ result } satisfies MeshWorkerSuccessResponse, [result.glb]);
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : String(error)
		} satisfies MeshWorkerErrorResponse);
	}
};

export type MeshWorkerResponse = MeshWorkerSuccessResponse | MeshWorkerErrorResponse;
