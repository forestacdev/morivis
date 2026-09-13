import type { FeatureCollection } from '$routes/map/types/geojson';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { disposeDxfModel } from '../dxf/mesh';
import { type CedxmResult, decodeCedxm, parseCedxm } from '.';
import { createCedxmModel } from './mesh';

export type CedxmRequest = { type: 'parse'; buffer: ArrayBuffer; } | {
	type: 'mesh';
	geojson: FeatureCollection;
};
export type CedxmResponse = { result: CedxmResult; } | { glb: ArrayBuffer; };
self.onmessage = async ({ data }: MessageEvent<CedxmRequest>) => {
	let model: ReturnType<typeof createCedxmModel> | undefined;
	try {
		if (data.type === 'parse') {
			postMessage({ result: parseCedxm(decodeCedxm(data.buffer)) } satisfies CedxmResponse);
		} else {
			model = createCedxmModel(data.geojson);
			const glb = await new GLTFExporter().parseAsync(model, { binary: true });
			if (!(glb instanceof ArrayBuffer)) throw new Error('CEDXMをGLBに変換できませんでした');
			(self as unknown as Worker).postMessage({ glb } satisfies CedxmResponse, [glb]);
		}
	} catch (error) {
		postMessage({ error: error instanceof Error ? error.message : String(error) });
	} finally {
		if (model) disposeDxfModel(model);
	}
};
