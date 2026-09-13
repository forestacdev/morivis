import type { FeatureCollection } from '$routes/map/types/geojson';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createDxfModel, disposeDxfModel } from './mesh';

self.onmessage = async ({ data }: MessageEvent<FeatureCollection>) => {
	let model: ReturnType<typeof createDxfModel> | undefined;
	try {
		model = createDxfModel(data);
		const glb = await new GLTFExporter().parseAsync(model, { binary: true });
		if (!(glb instanceof ArrayBuffer)) throw new Error('DXFのGLB変換に失敗しました');
		(self as unknown as Worker).postMessage({ glb }, [glb]);
	} catch (error) {
		postMessage({ error: error instanceof Error ? error.message : String(error) });
	} finally {
		if (model) disposeDxfModel(model);
	}
};
