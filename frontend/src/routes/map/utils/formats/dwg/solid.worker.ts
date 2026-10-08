import { scaleIndexedCadMesh } from '../dxf/indexed-mesh';
import { type DecodedDrawing, dwgConversionError, readDwgBinary } from './acis';
import { loadDwgRuntime } from './runtime';

export interface DwgSolidRequest {
	job: Uint8Array<ArrayBuffer>;
	metersPerUnit: number;
}
export type DwgSolidResult = Pick<DecodedDrawing, 'solids' | 'skippedSolids'>;
export type DwgSolidResponse = { result: DwgSolidResult; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<DwgSolidRequest>) => {
	try {
		const runtime = await loadDwgRuntime();
		const { solids, skippedSolids } = readDwgBinary(runtime.mesh_dwg_solid(data.job));
		for (const solid of solids) scaleIndexedCadMesh(solid, data.metersPerUnit);
		const buffers = [...new Set(solids.map(solid => solid.positions.buffer))] as ArrayBuffer[];
		(self as unknown as Worker).postMessage(
			{ result: { solids, skippedSolids } } satisfies DwgSolidResponse,
			buffers
		);
	} catch (error) {
		postMessage({ error: dwgConversionError(error).message } satisfies DwgSolidResponse);
	}
};
